require('dotenv').config(); // Carga las variables del archivo .env

const express = require('express');
const cors = require('cors');
const path = require('path');
const xlsx = require('xlsx');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de rutas usando variables de entorno con fallback
const EXCEL_PATH = process.env.EXCEL_PATH 
  ? path.join(__dirname, process.env.EXCEL_PATH) 
  : path.join(__dirname, '../Data/bd cleintes.xlsx');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Garantizar la existencia de los directorios necesarios
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const dataDir = path.dirname(EXCEL_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `bd_cleintes_${Date.now()}.xlsx`)
});
const upload = multer({ storage });

function leerPestanaExcel(workbook, nombrePestana) {
  const sheet = workbook.Sheets[nombrePestana];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

function getValorFlexible(obj, posiblesNombres) {
  if (!obj) return '';
  const keyMatch = Object.keys(obj).find(k => posiblesNombres.includes(k.trim().toUpperCase()));
  return keyMatch ? obj[keyMatch] : '';
}

function calcularSemaforo(row) {
  const campos = [
    ['ID TERRENO', 'TERRENO'],
    ['ID CLIENTE', 'CLIENTE'],
    ['FORMA DE PAGO', 'PAGO'],
    ['INSTITUCION', 'FINANCIAMIENTO'],
    ['ETAPA', 'FASE'],
    ['DEP APARTADO', 'APARTADO']
  ];

  let puntos = 0;
  campos.forEach(posibles => {
    const val = getValorFlexible(row, posibles);
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== '0') puntos++;
  });

  const pct = Math.round((puntos / campos.length) * 100);
  let semaforo = '🔴 Incompleto';
  if (pct >= 80) semaforo = '🟢 Listo / Alto';
  else if (pct >= 40) semaforo = '🟡 En Proceso';

  return { pct, semaforo };
}

// Función para actualizar celdas de Excel conservando la estructura de encabezados
function actualizarOInsertarFila(workbook, sheetName, idColumnaNombres, idValor, camposAActualizar) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;

  const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  
  let rowIndex = rawData.findIndex(r => {
    const val = getValorFlexible(r, idColumnaNombres);
    return String(val).trim() === String(idValor).trim() && String(idValor).trim() !== '';
  });

  if (rowIndex !== -1) {
    Object.keys(camposAActualizar).forEach(colBuscada => {
      const targetKey = Object.keys(rawData[rowIndex]).find(k => k.trim().toUpperCase() === colBuscada.trim().toUpperCase()) || colBuscada;
      rawData[rowIndex][targetKey] = camposAActualizar[colBuscada];
    });
  } else {
    const nuevo = {};
    nuevo[idColumnaNombres[0]] = idValor;
    Object.keys(camposAActualizar).forEach(k => { nuevo[k] = camposAActualizar[k]; });
    rawData.push(nuevo);
  }

  workbook.Sheets[sheetName] = xlsx.utils.json_to_sheet(rawData);
}

// Ruta informativa inicial
app.get('/', (req, res) => {
  res.send('🚀 Backend CRM conectado y configurado con variables de entorno (.env).');
});

// 1. Obtener datos consolidados desde Excel
app.get('/api/procesos', (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_PATH)) return res.json([]);

    const workbook = xlsx.readFile(EXCEL_PATH);

    const rawProcesos = leerPestanaExcel(workbook, 'BD PROCESOS ACTIVOS DE VENTAS');
    const rawTerrenos = leerPestanaExcel(workbook, 'BD TERRENOS');
    const rawClientes = leerPestanaExcel(workbook, 'BD CLIENTE');
    const rawEmpresas = leerPestanaExcel(workbook, 'BD EMPRESA');

    const procesosConsolidados = rawProcesos.map((row, index) => {
      const idProceso = getValorFlexible(row, ['ID PROCESO', 'PROCESO', 'FOLIO']) || `PROC-${String(index + 1).padStart(3, '0')}`;
      const idCliente = String(getValorFlexible(row, ['ID CLIENTE', 'CLIENTE']) || '').trim();
      const idTerreno = String(getValorFlexible(row, ['ID TERRENO', 'TERRENO']) || '').trim();
      const idEmpresa = String(getValorFlexible(row, ['ID EMPRESA', 'EMPRESA']) || '').trim();

      const terrenoInfo = rawTerrenos.find(t => String(getValorFlexible(t, ['ID TERRENO', 'TERRENO'])).trim() === idTerreno && idTerreno !== '') || {};
      const clienteInfo = rawClientes.find(c => String(getValorFlexible(c, ['ID CLIENTE', 'CLIENTE'])).trim() === idCliente && idCliente !== '') || {};
      const empresaInfo = rawEmpresas.find(e => String(getValorFlexible(e, ['ID EMPRESA', 'EMPRESA'])).trim() === idEmpresa && idEmpresa !== '') || {};

      const { pct, semaforo } = calcularSemaforo(row);

      return {
        idProceso: String(idProceso),
        idCliente: idCliente || 'N/A',
        idTerreno: idTerreno || 'N/A',
        idEmpresa: idEmpresa || 'N/A',
        formaPago: String(getValorFlexible(row, ['FORMA DE PAGO', 'PAGO']) || 'N/A'),
        institucion: String(getValorFlexible(row, ['INSTITUCION', 'FINANCIAMIENTO']) || 'N/A'),
        etapa: String(getValorFlexible(row, ['ETAPA', 'FASE']) || 'Precalificación').trim(),
        porcentajeAvance: pct,
        estadoExpediente: semaforo,

        nombreCliente: String(getValorFlexible(clienteInfo, ['NOMBRE', 'NOMBRE CLIENTE', 'CLIENTE']) || 'S/D'),
        telefonoCliente: String(getValorFlexible(clienteInfo, ['TELEFONO CELULAR', 'TELEFONO FIJO', 'TELEFONO']) || 'S/D'),
        correoCliente: String(getValorFlexible(clienteInfo, ['CORREO ELECTRONICO', 'CORREO']) || 'S/D'),

        manzana: String(getValorFlexible(terrenoInfo, ['MANZANA']) || 'S/D'),
        lote: String(getValorFlexible(terrenoInfo, ['LOTE']) || 'S/D'),
        precioLista: String(getValorFlexible(terrenoInfo, ['PRECIO DE LISTA', 'PRECIO DE VENTA', 'PRECIO']) || 'S/D'),

        nombreEmpresa: String(getValorFlexible(empresaInfo, ['NOMBRE EMPRESA', 'RL', 'EMPRESA']) || 'N/A')
      };
    });

    res.json(procesosConsolidados);
  } catch (error) {
    console.error('Error al consolidar:', error);
    res.status(500).json({ error: 'Error al consolidar pestañas del Excel' });
  }
});

// 2. Guardar edición completa multi-pestaña en Excel
app.post('/api/procesos/editar-completo', (req, res) => {
  const { idProceso, datosProceso, datosCliente, datosTerreno, datosEmpresa } = req.body;
  try {
    if (!fs.existsSync(EXCEL_PATH)) return res.status(404).json({ error: 'Archivo no encontrado' });

    const workbook = xlsx.readFile(EXCEL_PATH);

    // 1. Guardar en BD PROCESOS ACTIVOS DE VENTAS
    actualizarOInsertarFila(workbook, 'BD PROCESOS ACTIVOS DE VENTAS', ['ID PROCESO', 'PROCESO', 'FOLIO'], idProceso, {
      'ID CLIENTE': datosProceso.idCliente,
      'ID TERRENO': datosProceso.idTerreno,
      'ID EMPRESA': datosProceso.idEmpresa,
      'FORMA DE PAGO': datosProceso.formaPago,
      'INSTITUCION': datosProceso.institucion,
      'ETAPA': datosProceso.etapa
    });

    // 2. Guardar en BD CLIENTE
    if (datosCliente && datosCliente.idCliente && datosCliente.idCliente !== 'N/A') {
      actualizarOInsertarFila(workbook, 'BD CLIENTE', ['ID CLIENTE', 'CLIENTE'], datosCliente.idCliente, {
        'NOMBRE ': datosCliente.nombreCliente,
        'TELEFONO CELULAR': datosCliente.telefonoCliente,
        'CORREO ELECTRONICO': datosCliente.correoCliente
      });
    }

    // 3. Guardar en BD TERRENOS
    if (datosTerreno && datosTerreno.idTerreno && datosTerreno.idTerreno !== 'N/A') {
      actualizarOInsertarFila(workbook, 'BD TERRENOS', ['ID TERRENO', 'TERRENO'], datosTerreno.idTerreno, {
        'MANZANA': datosTerreno.manzana,
        'LOTE': datosTerreno.lote,
        'PRECIO DE LISTA': datosTerreno.precioLista
      });
    }

    // 4. Guardar en BD EMPRESA
    if (datosEmpresa && datosEmpresa.idEmpresa && datosEmpresa.idEmpresa !== 'N/A') {
      actualizarOInsertarFila(workbook, 'BD EMPRESA', ['ID EMPRESA', 'EMPRESA'], datosEmpresa.idEmpresa, {
        'NOMBRE EMPRESA': datosEmpresa.nombreEmpresa
      });
    }

    xlsx.writeFile(workbook, EXCEL_PATH);
    console.log('✅ Cambios guardados correctamente en el archivo Excel');
    res.json({ success: true, message: 'Guardado correctamente en Excel' });
  } catch (error) {
    console.error('❌ Error al guardar en Excel:', error);
    res.status(500).json({ error: 'Error al guardar en el archivo Excel' });
  }
});

// 3. Crear nuevo expediente
app.post('/api/procesos/nuevo', (req, res) => {
  try {
    const nuevo = req.body;
    let workbook;
    let rawData = [];
    const sheetName = 'BD PROCESOS ACTIVOS DE VENTAS';

    if (fs.existsSync(EXCEL_PATH)) {
      workbook = xlsx.readFile(EXCEL_PATH);
      if (workbook.Sheets[sheetName]) {
        rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      }
    } else {
      workbook = xlsx.utils.book_new();
    }

    const nuevoRegistro = {
      'ID PROCESO': `PROC-${String(rawData.length + 1).padStart(3, '0')}`,
      'ID CLIENTE': nuevo.idCliente || '',
      'ID TERRENO': nuevo.idTerreno || '',
      'FORMA DE PAGO': nuevo.formaPago || 'Efectivo',
      'INSTITUCION': nuevo.institucion || 'Contado',
      'ETAPA': nuevo.etapa || 'Precalificación',
      'DEP APARTADO': '1'
    };

    rawData.push(nuevoRegistro);
    workbook.Sheets[sheetName] = xlsx.utils.json_to_sheet(rawData);
    xlsx.writeFile(workbook, EXCEL_PATH);

    res.json({ success: true, message: 'Nuevo expediente registrado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear expediente' });
  }
});

// 4. Subir nuevo archivo Excel
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });

    fs.copyFileSync(req.file.path, EXCEL_PATH);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({ success: true, message: 'Excel subido correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar archivo' });
  }
});

// Puerto dinámico desde .env
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Backend escuchando en el puerto ${PORT}`));