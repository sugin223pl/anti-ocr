<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, computed, onBeforeMount, reactive } from 'vue'
import mainIcon from './assets/img/icon.png?url'
import placeholderIMG from './assets/img/placeholder.svg?url'

const ocrtext = ref('')
//const imgexif = ref({});
const modal = ref(false)
const fileinput = ref('')
const ocrtype = ref('')
const ocrimg = ref<string | null>(null)
const isLoading = ref(false)

const disable = computed(() => ocrtext.value == '' || ocrimg.value == null)
const isDownload = ref(false)

function genFileName() {
  const rand = Math.floor(1000 + Math.random() * 9000)
  return 'IMG_' + rand * rand
}

window.electron.ipcRenderer.on('reset', () => {
  isDownload.value = false
  const output: any = document.getElementById('preview')
  output.src = placeholderIMG
  const download: any = document.getElementById('download')

  ocrtype.value = ''
  ocrimg.value = ''
  download.href = '#'
  download.download = ''
  isLoading.value = false
})

window.electron.ipcRenderer.on('pong', (_event, message: string) => {
  isDownload.value = true
  const output: any = document.getElementById('preview')
  const download: any = document.getElementById('download')

  download.href = message
  download.download = genFileName()
  output.src = message
  isLoading.value = false
})
function DownloadIMG() {
  const download: any = document.getElementById('download')
  download.click()

  setTimeout(() => {
    isDownload.value = false
    ocrimg.value = null
    const output: any = document.getElementById('preview')
    output.src = placeholderIMG
  }, 1000)
}

window.electron.ipcRenderer.on('receive-file', (_event, { raw, mime }) => {
  const url = `data:${mime};base64,${raw}`
  // @ts-ignore I need it;
  const output: any = document.getElementById('preview')
  output.src = url
  isLoading.value = false
  ocrimg.value = url
  isDownload.value = false
})
interface dataPing {
  text: string
  img: string
  type: string
}

async function sendPing(message: dataPing) {
  await window.electron.ipcRenderer.send('ping', message)
}

const newFile = (event) => {
  ocrimg.value = null
  const files = event.target.files
  if (files.length) {
    const File: File = files[0]
    const objectURL = URL.createObjectURL(File)
    ocrimg.value = objectURL
    ocrtype.value = File.type
    const output = document.getElementById('preview')
    // @ts-ignore I need it;
    output.src = URL.createObjectURL(files[0])
    // @ts-ignore I need it;
    output.onload = function () {
      // @ts-ignore I need it;
      URL.revokeObjectURL(output.src)
    }
  }
}
const submitForm = () => {
  isLoading.value = true
  const msg: dataPing = {
    text: ocrtext.value,
    // @ts-ignore I need it;
    img: ocrimg.value,
    type: ocrtype.value
  }
  sendPing(msg)
}

const openDialog = async () => {
  await window.electron.ipcRenderer.send('open-dialog')
}

const licensed = ref(true)
const isChecking = ref(false)
const Lic = reactive({
  key: '',
  activation: false,
  errors: false,
  status: 'FREE_TRIAL',
  message:
    "Thank you for choosing our product! To unlock its full potential, please enter your license key below. If you haven't purchased one yet, you can do so on our website. Need any assistance? Feel free to reach out to our support team."
})

onBeforeMount(async () => {
  await checkIfLicensed()
})

// ACTIVATE LICENSE ON THIS MACHINE
async function activateLicense() {
  isChecking.value = true
  await window.electron.ipcRenderer.send('GATE_ACTIVATE', { key: Lic.key })
}
window.electron.ipcRenderer.on('GATE_ACTIVATE_RESPONSE', (_event, response) => {
  Object.assign(Lic, { ...response })
  console.log(Lic)
  licensed.value = !response.errors
  isChecking.value = false
}) // END

// CHECK IF LICENSED
async function checkIfLicensed() {
  await window.electron.ipcRenderer.send('IS_LICENSED')
}
window.electron.ipcRenderer.on('IS_LICENSED_RESPONSE', (_event, isvalid: boolean) => {
  licensed.value = isvalid
  if (isvalid) {
    Lic.status = 'LICENSED'
    Lic.message =
      'Your software has been successfully licensed with the provided key. You now have full access to all premium features, updates, and support.'
  } else {
    Lic.status = 'FREE_TRIAL'
    Lic.message =
      "Thank you for choosing our product! To unlock its full potential, please enter your license key below. If you haven't purchased one yet, you can do so on our website. Need any assistance? Feel free to reach out to our support team."
  }
}) // END
// DEACTIVATE LICENSE FUNCTION

async function deactivateLicense() {
  if (
    confirm(
      "Are you sure you want to deactivate your license key?\n  If you proceed, please note that you may need to re-purchase or reactivate your license in the future.\n\n  If you're sure about this decision, click 'OK' below. If you have any questions or need assistance, please contact our support team."
    ) == true
  ) {
    await window.electron.ipcRenderer.send('DEACTIVATE_LICENSE')
  }
}
// GATE SUBMIT FORM - CHECK LICKENSE
async function checkLicense() {
  isChecking.value = true
  await window.electron.ipcRenderer.send('GATE_SUBMIT', { key: Lic.key })
}
async function purchase() {
  isChecking.value = true
  await window.electron.ipcRenderer.send('purchase', 'https://vuescripts.lemonsqueezy.com/checkout/buy/6fafa100-233b-4090-838b-37d77ead7f1e')
}

window.electron.ipcRenderer.on('GATE_RESPONSE', (_event, response) => {
  Object.assign(Lic, { ...response })
  console.log(Lic)
  isChecking.value = false
}) // END

// MODAL LICENSE OPEN
function openModal(action: boolean) {
  if (action) {
    checkIfLicensed()
  }
  modal.value = action
} // END
</script>

<template>
  <teleport to="#clear" v-if="licensed">
    <div>
      <small style="margin-bottom: 5px; display: block; color: red">
        <a href="#" @click.prevent="deactivateLicense">Deactivate application</a>
      </small>
    </div>
  </teleport>

  <teleport to="#license" v-else>
    <div style="background-color: #fff; text-align: center">
      <small style="margin-bottom: 5px; display: block; color: red">
        <span>Unlicensed! Free 30 day trial.</span> |
        <span>Click</span>
        <span style="margin: 0 5px"
          ><a style="color: black" href="#" @click.prevent="openModal(true)">here</a></span
        >
        <span>to enter license key. </span> or <a style="color: black" href="#" @click.prevent="purchase">purchase</a> application
      </small>
    </div>
  </teleport>
  <img :src="mainIcon" alt="Icon" />
  <form @submit.prevent="submitForm">
    <label for="title">Anti OCR Text</label>
    <div style="text-align: center">
      <a href="#" @click.prevent="openDialog">
        <span v-if="ocrimg != null">Change Image</span>
        <span v-else>Select Image</span>
      </a>
    </div>
    <input ref="fileinput" class="file" type="file" accept="image/*" @change="newFile" />
    <input
      v-model="ocrtext"
      :aria-busy="isLoading"
      aria-label="Please wait…"
      class="ocrtext"
      name="ocrtext"
      type="text"
      placeholder="ocr text ..."
      :disabled="isLoading"
      required
    />
    <button v-if="isDownload" type="button" @click="DownloadIMG" class="dlbutton">
      <span>Download</span>
    </button>
    <button
      v-else
      type="submit"
      :aria-busy="isLoading"
      :disabled="isLoading || disable"
      aria-label="Please wait…"
    >
      <span v-if="ocrimg == null">no img</span>
      <span v-else>
        <span v-if="isLoading">Working ...</span>
        <span v-else>Write Text</span>
      </span>
    </button>

    <hr />
    <div class="output" style="text-align: center">
      <img
        id="preview"
        :src="placeholderIMG"
        alt="No image"
        style="
          width: 350px;
          height: auto;
          object-fit: cover;
          aspect-ratio: 1/1;
          border-radius: 20px;
        "
      />
      <a href="#" id="download" style="margin: 0 auto; visibility: hidden" download="file.jpg"
        >download image</a
      >
    </div>
  </form>
  <!-- <Versions /> -->
  <dialog :open="modal" class="activation-modal">
    <article>
      <header>
        <button aria-label="Close" rel="prev" @click.prevent="openModal(false)"></button>
        <p>
          <strong>🗓️ Application licensing</strong>
        </p>
      </header>
      <div
        :class="{ errors: Lic.errors, success: licensed && Lic.status == 'LICENSE_ACTIVE' }"
        class="lic"
      >
        <p>{{ Lic.message }}</p>
        <hr style="max-width: 60%" />
        <div class="status">
          <span>
            <span>Status:</span> <strong>{{ Lic.status }}</strong>
          </span>
        </div>
      </div>
      <div>
        <form v-if="!licensed && Lic.status == 'LICENSE_ACTIVE'" @submit.prevent="activateLicense">
          <div>
            <input
              v-model="Lic.key"
              required
              :disabled="isChecking"
              type="text"
              placeholder="8c339b42-8355****************"
              :aria-invalid="Lic.errors"
            />
          </div>
          <div>
            <button
              style="max-width: 350px"
              :disabled="isChecking"
              type="submit"
              class="dlbutton"
              :aria-busy="isChecking"
              aria-label="Please wait…"
            >
              <span>ACTIVATE</span>
            </button>
          </div>
        </form>
        <form v-else-if="licensed && Lic.activation">
          <div>
            <input
              v-model="Lic.key"
              required
              :disabled="true"
              type="text"
              placeholder="8c339b42-8355****************"
              :aria-invalid="Lic.errors"
            />
          </div>
        </form>
        <form v-else @submit.prevent="checkLicense">
          <div>
            <input
              v-model="Lic.key"
              required
              :disabled="isChecking"
              type="text"
              placeholder="8c339b42-8355****************"
              :aria-invalid="Lic.errors"
            />
          </div>
          <div>
            <button
              style="max-width: 350px"
              :disabled="isChecking"
              type="submit"
              class="dlbutton"
              :aria-busy="isChecking"
              aria-label="Please wait…"
            >
              <span>Submit License</span>
            </button>
          </div>
        </form>
      </div>
    </article>
  </dialog>
</template>
