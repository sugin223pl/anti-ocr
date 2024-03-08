import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
//import handwritten from 'handwritten.js';
import Jimp from 'jimp';
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset';
import mime from 'mime-types';
import piexif from 'piexifjs';

function get_random (list) {
  return list[Math.floor((Math.random()*list.length))];
}
const exifs = [
  'exifs/iphone-12-pro.jpg',
  'exifs/iphone-x.jpg',
  'exifs/iphone-xs-max.jpg',
  'exifs/motorola-one-hyper.jpg',
  'exifs/nikon.jpg',
  'exifs/panasonic.jpg',
  'exifs/sony.jpg',
];




const Store = {
  image: '',
  mime: '',
  name: '',
  ext: '',
  mainEXIF: '',
  exifin: '',
  raw: ''
}
const getBase64DataFromJpegFile = filename => readFileSync(filename).toString('binary');
const getExifFromJpegFile = filename => piexif.load(getBase64DataFromJpegFile(filename));
function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    icon: 'icon.ico',
    height: 1024,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  // IPC test
  ipcMain.on('open-dialog', (event) => {
    dialog
      .showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg'] }]
      })
      .then(async ({ filePaths }) => {
        Object.assign(Store, { mime: '', image: '', raw: '', name: '', ext: '' });

        if(filePaths.length > 0) {
          const filepath = filePaths[0];
          const newImageData = getBase64DataFromJpegFile(filepath);
          const exif = get_random(exifs);
          Store.mainEXIF = getExifFromJpegFile(exif);

          const newExif = {
              '0th': { ...Store.mainEXIF['0th'] },
              'Exif': { ...Store.mainEXIF['Exif'] },
              'GPS': { ...Store.mainEXIF['GPS'] },
              'Interop': { ...Store.mainEXIF['Interop'] },
              '1st': { ...Store.mainEXIF['1st'] },
              'thumbnail': null
          };

          const newExifBinary = piexif.dump(newExif);
          const newPhotoData = piexif.insert(newExifBinary, newImageData);

          const raw = Buffer.from(newPhotoData, 'binary');
          const newfilepath = 'exif-revised' + extname(filepath);
          writeFileSync(newfilepath, raw);


          // const raw = await readFile(filepath, { encoding: "utf8" });
          const base64 = await readFile(newfilepath, { encoding: "base64" });

          const objectN = {
            mime: mime.lookup(filepath),
            image: newfilepath,
            raw: raw,
            name: basename(filepath),
            ext: extname(filepath)
          }

          Object.assign(Store, objectN);

          event.sender.send("receive-file", {
            raw: base64,
            name: Store.name,
            ext: Store.ext,
            mime: Store.mime
          });
        }
      })
  });


  ipcMain.on('ping', (event, text) => {

    Jimp.read(Store.image)
      .then((image) => {
        Jimp.loadFont("jeURtOG_ZKxNX4XOyeLeaTzn.ttf.fnt").then((font) => {
          image.quality(100);
          image.print(font, 10, 10, text, 500);
          //image.write(Store.name);
          image.getBase64Async(Store.mime).then((result) => {
            event.sender.send('pong', result);
          });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });

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
