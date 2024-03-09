/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('fix-esm').register()
const { app, shell, BrowserWindow, ipcMain, dialog, autoUpdater } = require('electron')
const { join, basename, extname } = require('node:path')
// const { initialize, trackEvent } = require('@aptabase/electron/main')
const { readFileSync, writeFileSync } = require('node:fs')
const { electronApp, optimizer, is } = require('@electron-toolkit/utils')
const { machineIdSync } = require('node-machine-id')
const debug = require('electron-debug')
const Jimp = require('jimp')
const piexif = require('piexifjs')
const { contentType } = require('mime-types')
const unhandled = require('electron-unhandled')
const fetch = require('node-fetch')
const MainStore = require('electron-store')

//const autoUpdater = require("electron-updater").autoUpdater
const machineID = machineIdSync({ original: true })
const schema = {
  LICENSE_KEY: {
    type: 'string',
    default: ''
  },
  LICENSE_ACTIVE: {
    type: 'boolean',
    default: false
  },
  MACHINE_NAME: {
    type: 'string',
    default: machineID
  },
  INSTANCE_ID: {
    type: 'string',
    default: ''
  },
  ACTIVATION_STATUS: {
    type: 'boolean',
    default: false
  }
}
const mainStore = new MainStore({ schema })

unhandled()
debug({
  isEnabled: false
})
// initialize('A-EU-4206936490')
const headers = {
  'content-type': 'application/json',
  accept: 'application/json'
}

async function LemonActivation(key, action = 'validate') {
  const postRequest = await fetch(`https://api.lemonsqueezy.com/v1/licenses/${action}`, {
    method: 'POST',
    headers,
    body:
      mainStore.get('INSTANCE_ID') == ''
        ? JSON.stringify({
            license_key: key,
            instance_name: action === 'validate' ? null : machineID
          })
        : JSON.stringify({
            license_key: key,
            instance_id: mainStore.get('INSTANCE_ID')
          })
  })

  const postData = await postRequest.json()

  if (action === 'deactivate') {
    mainStore.clear()
  }
  if (mainStore.get('INSTANCE_ID') != '') {
    if (!postData.valid) {
      mainStore.clear()
    }
  }
  // console.log('--------------------' + action + ' Machine---------------')
  // console.log('Machine ID', machineID)
  // console.log(postData)
  // console.log('-----------------------------------------------------')

  if ('instance' in postData) {
    if (postData.instance != null && 'id' in postData.instance) {
      mainStore.set('INSTANCE_ID', postData.instance.id)
      if (action === 'activate') {
        mainStore.set('ACTIVATION_STATUS', postData.activated)
        //console.log('SET ACTIVATION_STATUS::: ', mainStore.get('ACTIVATION_STATUS'))
      } else {
        // console.log('CHECK ACTIVATION_STATUS:: ', mainStore.get('ACTIVATION_STATUS'))
      }
    }
  }
  return {
    valid: action === 'validate' ? postData.valid : postData.activated,
    error: postData.error
  }
}
// 2B2F39E2-B58E-4C19-B564-F9FCA962FCCD

function get_random(list) {
  return list[Math.floor(Math.random() * list.length)]
}

const fontPath = join(__dirname, '../../jeURtOG_ZKxNX4XOyeLeaTzn.ttf.fnt')
const exifs = [
  join(__dirname, '../../iphone-12-pro.jpg'),
  join(__dirname, '../../iphone-x.jpg'),
  join(__dirname, '../../iphone-xs-max.jpg'),
  join(__dirname, '../../motorola-one-hyper.jpg'),
  join(__dirname, '../../nikon.jpg'),
  join(__dirname, '../../panasonic.jpg'),
  join(__dirname, '../../sony.jpg')
]

const Store = {
  image: '',
  mime: '',
  name: '',
  ext: '',
  mainEXIF: '',
  exifin: '',
  raw: ''
}


const getBase64DataFromJpegFile = (filename) => readFileSync(filename).toString('binary')
const getExifFromJpegFile = (filename) => piexif.load(getBase64DataFromJpegFile(filename))
function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    icon: 'icon.ico',
    height: 1024,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: 'icon.ico' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.antiocr')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // trackEvent('app_started')
  ipcMain.on('purchase', async (_event, purchaseURL) => {
    shell.openExternal(purchaseURL)
  })
  ipcMain.on('GATE_ACTIVATE', async (event, { key }) => {
    const { valid, error } = await LemonActivation(key, 'activate')
    mainStore.set('LICENSE_KEY', valid ? key : '')
    mainStore.set('LICENSE_ACTIVE', valid)
    const response = {
      key: valid ? key : '',
      errors: !valid,
      activation: mainStore.get('ACTIVATION_STATUS'),
      status: !valid ? 'ACTIVATION_LIMIT' : 'LICENSE_ACTIVE',
      message: error ? error : 'License has been registered to your machine.'
    }

    // console.log( mainStore.get('LICENSE_ACTIVE') )
    // console.log( mainStore.get('LICENSE_KEY') )
    // console.log( mainStore.get('MACHINE_NAME') )
    // console.log( mainStore.get('INSTANCE_ID') )
    // console.log( mainStore.get('ACTIVATION_STATUS') )

    event.sender.send('GATE_ACTIVATE_RESPONSE', response)
  })
  ipcMain.on('GATE_SUBMIT', async (event, { key }) => {
    const { valid, error } = await LemonActivation(key)
    let message = ''
    let status = ''

    if (!valid && error != null) {
      if (error.includes('not found')) {
        message =
          'License key you entered could not be found. Please double-check the key and try again.'
        status = 'NOT_FOUND'
      } else if (error.includes('expired')) {
        message =
          'Sorry, the license key you entered has expired. Please renew your license to continue using the software.'
        status = 'LICENSE_EXPIRED'
      } else if (error.includes('disabled')) {
        message =
          "We're sorry, but the license key you entered has been disabled. Please contact our support team for further assistance."
        status = 'LICENSE_DISABLED'
      } else {
        message = error
        status = 'UNKNOWN_ERROR'
      }
    } else {
      message =
        'Congratulations! The license key you entered is valid and ready to activate your software. Would you like to proceed with the activation using this key?'
      status = 'LICENSE_ACTIVE'
    }

    const response = {
      key: valid ? key : '',
      errors: !valid,
      status,
      activation: mainStore.get('ACTIVATION_STATUS'),
      message
    }
    //console.log(response);
    event.sender.send('GATE_RESPONSE', response)
  })
  ipcMain.on('DEACTIVATE_LICENSE', async (event) => {
    await LemonActivation(mainStore.get('LICENSE_KEY'), 'deactivate')
    event.sender.send('IS_LICENSED_RESPONSE', mainStore.get('LICENSE_ACTIVE'))
  })
  ipcMain.on('IS_LICENSED', async (event) => {
    //mainStore.clear()
    if (mainStore.get('LICENSE_ACTIVE')) {
      await LemonActivation(mainStore.get('LICENSE_KEY'))
    }

    // console.log("============================================================")
    // console.log("=============== || ACTIVATION STATUS ||=====================")
    // console.log("============================================================")
    // console.log("LICENSE_ACTIVE",   mainStore.get('LICENSE_ACTIVE') )
    // console.log("LICENSE_KEY",   mainStore.get('LICENSE_KEY') )
    // console.log("MACHINE_NAME",   mainStore.get('MACHINE_NAME') )
    // console.log("INSTANCE_ID",   mainStore.get('INSTANCE_ID') )
    // console.log("ACTIVATION_STATUS",   mainStore.get('ACTIVATION_STATUS') )
    // console.log("============================================================")
    // console.log("============================================================")

    event.sender.send('IS_LICENSED_RESPONSE', mainStore.get('LICENSE_ACTIVE'))
  })

  // IPC test
  ipcMain.on('open-dialog', (event) => {
    dialog
      .showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg'] }]
      })
      .then(({ filePaths }) => {
        Object.assign(Store, { mime: '', image: '', raw: '', name: '', ext: '' })
        if (filePaths.length > 0) {
          const filepath = filePaths[0]
          const newImageData = getBase64DataFromJpegFile(filepath)
          const exif = get_random(exifs)
          Store.mainEXIF = getExifFromJpegFile(exif)
          const newExif = {
            '0th': { ...Store.mainEXIF['0th'] },
            Exif: { ...Store.mainEXIF['Exif'] },
            GPS: { ...Store.mainEXIF['GPS'] },
            Interop: { ...Store.mainEXIF['Interop'] },
            '1st': { ...Store.mainEXIF['1st'] },
            thumbnail: null
          }

          const newExifBinary = piexif.dump(newExif)
          const newPhotoData = piexif.insert(newExifBinary, newImageData)

          const raw = Buffer.from(newPhotoData, 'binary')
          const newfilepath = join('./exif-revised' + extname(filepath))
          try {
            writeFileSync(newfilepath, raw)
          } catch (e) {
            throw 'Failed to save the file !' + newfilepath
          } finally {
            const base64 = readFileSync(newfilepath, { encoding: 'base64' })

            const objectN = {
              mime: contentType(filepath),
              image: newfilepath,
              raw: raw,
              name: basename(filepath),
              ext: extname(filepath)
            }

            Object.assign(Store, objectN)

            event.sender.send('receive-file', {
              raw: base64,
              name: Store.name,
              ext: Store.ext,
              mime: Store.mime
            })

            // trackEvent('ocr_img_created')
          }
        } else {
          Object.assign(Store, { mime: '', image: '', raw: '', name: '', ext: '' })
          event.sender.send('reset')
        }
      })
  })

  ipcMain.on('ping', (event, text) => {
    Jimp.read(Store.image)
      .then((image) => {
        Jimp.loadFont(fontPath).then((font) => {
          image.quality(100)
          image.print(font, 10, 10, text, 500)
          //image.write(Store.name);
          image.getBase64Async(Store.mime).then((result) => {
            event.sender.send('pong', result)
          })
        })
      })
      .catch((err) => {
        console.log(err)
      })
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
