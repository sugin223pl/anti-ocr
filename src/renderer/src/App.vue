<script setup lang="ts">
import { ref, computed } from "vue";
import mainIcon from './assets/img/icon.png?url'
import placeholderIMG from './assets/img/placeholder.svg?url'

const ocrtext = ref('WhatsApp: +39 333 678 900');
//const imgexif = ref({});
const modal = ref(false);
const fileinput = ref('');
const ocrtype = ref('');
const ocrimg = ref<string | null>(null);
const isLoading = ref(false);

const disable = computed(() => ocrtext.value == '' || ocrimg.value == null);
const isDownload = ref(false);
const numid = computed(() => Math.floor(1000 + Math.random() * 9000));
window.electron.ipcRenderer.on('pong', (_event, message: string) => {
  isDownload.value = true;
  const output: any = document.getElementById('preview');
  const download: any = document.getElementById('download');

  download.href = message;
  download.download = 'IMG_' + numid.value + numid.value;
  output.src = message;
  isLoading.value = false;

});
function DownloadIMG() {
  const download: any = document.getElementById('download');
  download.click();

  setTimeout(() => {
    isDownload.value = false;
    ocrimg.value = null;
    const output: any = document.getElementById('preview');
    output.src = placeholderIMG;
  }, 1000);
}


window.electron.ipcRenderer.on('receive-file', (_event, { raw, mime }) => {
  const url = `data:${mime};base64,${raw}`;
  // @ts-ignore I need it;
  const output: any = document.getElementById('preview');
  output.src = url;
  isLoading.value = false;
  ocrimg.value = url;
  isDownload.value = false;
});


interface dataPing {
  text: string;
  img: string;
  type: string;
}

async function sendPing(message: dataPing) {
  await window.electron.ipcRenderer.send('ping', message);
}



const newFile = (event) => {
  ocrimg.value = null;
  const files = event.target.files;
  if (files.length) {
    const File: File = files[0];
    const objectURL = URL.createObjectURL(File);
    ocrimg.value = objectURL;
    ocrtype.value = File.type;
    const output = document.getElementById('preview');
    // @ts-ignore I need it;
    output.src = URL.createObjectURL(files[0]);
    // @ts-ignore I need it;
    output.onload = function () {
      // @ts-ignore I need it;
      URL.revokeObjectURL(output.src);
    }
  }
}
const submitForm = () => {
  isLoading.value = true;
  const msg: dataPing = {
    text: ocrtext.value,
    // @ts-ignore I need it;
    img: ocrimg.value,
    type: ocrtype.value,
  };
  sendPing(msg);
}

const openDialog = async () => {
  await window.electron.ipcRenderer.send('open-dialog');
}
</script>

<template>
  <img :src="mainIcon" alt="Icon" />
  <form @submit.prevent="submitForm">
    <label for="title">Anti OCR Text</label>
    <div style="text-align: center;">
      <a href="#" @click.prevent="openDialog">
        <span v-if="ocrimg != null">Change Image</span>
        <span v-else>Select Image</span>
      </a>
    </div>
    <input ref="fileinput" class="file" type="file" accept="image/*" @change="newFile" />
    <input
      v-model="ocrtext"
      :aria-busy="isLoading" aria-label="Please wait…"
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
    <div class="output" style="text-align: center;">
      <img
        id="preview"
        :src="placeholderIMG"
        alt="No image"
        style="width: 350px; height: auto; object-fit: cover; aspect-ratio: 1/1; border-radius: 20px;"
      />
      <a href="#" id="download" style="margin: 0 auto; visibility: hidden;" download="file.jpg">download image</a>
    </div>
  </form>
  <!-- <Versions /> -->
  <dialog :open="modal">
    <article>
      <header>
        <button aria-label="Close" rel="prev"></button>
        <p>
          <strong>🗓️ Thank You for Registering!</strong>
        </p>
      </header>
      <p>
        We're excited to have you join us for our
        upcoming event. Please arrive at the museum
        on time to check in and get started.
      </p>
      <ul>
        <li>Date: Saturday, April 15</li>
        <li>Time: 10:00am - 12:00pm</li>
      </ul>
    </article>
  </dialog>
</template>
