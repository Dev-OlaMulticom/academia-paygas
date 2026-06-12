#!/usr/bin/env node

// Script de prueba para conectar con el API de WordPress Academia PayGas

const API_BASE_URL = "https://academia.paygas.com.br/www/index.php?rest_route=/academia-paygas/v1"
const API_KEY = "plQECab8eecbyGbEAmDEBzjilSpZnTKx"

async function testAPI() {
  console.log('🔍 Probando conexión con el API de WordPress Academia PayGas...\n')
  console.log(`📍 API Base URL: ${API_BASE_URL}`)
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`)

  // Test 1: Obtener documentación del API
  console.log('📚 Test 1: Obteniendo documentación del API...')
  try {
    const response = await fetch(`${API_BASE_URL}/docs`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Documentación obtenida exitosamente')
      console.log(`   - Título: ${data.info?.title || 'N/A'}`)
      console.log(`   - Versión: ${data.info?.version || 'N/A'}`)
      console.log(`   - Endpoints: ${data.paths ? Object.keys(data.paths).length : 0}\n`)
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`)
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`)
  }

  // Test 2: Obtener usuarios
  console.log('👥 Test 2: Obteniendo usuarios...')
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Usuarios obtenidos exitosamente')
      console.log(`   - Cantidad: ${Array.isArray(data) ? data.length : 'N/A'}\n`)
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`)
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`)
  }

  // Test 3: Obtener trilhas
  console.log('📚 Test 3: Obteniendo trilhas...')
  try {
    const response = await fetch(`${API_BASE_URL}/trilhas`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Trilhas obtenidas exitosamente')
      console.log(`   - Cantidad: ${Array.isArray(data) ? data.length : 'N/A'}\n`)
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`)
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`)
  }

  // Test 4: Obtener módulos
  console.log('📖 Test 4: Obteniendo módulos...')
  try {
    const response = await fetch(`${API_BASE_URL}/modulos`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Módulos obtenidos exitosamente')
      console.log(`   - Cantidad: ${Array.isArray(data) ? data.length : 'N/A'}\n`)
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`)
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`)
  }

  console.log('🎯 Pruebas completadas.')
}

// Ejecutar pruebas
testAPI().catch(console.error)
