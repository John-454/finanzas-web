// ========================================
// CONFIGURACIÓN PARA PRODUCCIÓN
// ========================================

// Detección automática de entorno
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Base de API configurable (Render por defecto)
const API_ROOT = (typeof window !== 'undefined' && window.API_ROOT) || localStorage.getItem('API_ROOT') || 'https://api-finanzas-vk8w.onrender.com';
const API_AUTH = `${API_ROOT}/api/auth`;

// Sistema de logs condicionales (solo en desarrollo)
const logger = {
  log: (message, data = '') => {
    if (isDevelopment) {
      console.log(message, data);
    }
  },
  error: (message, data = '') => {
    // Los errores siempre se muestran (incluso en producción)
    console.error(message, data);
  },
  warn: (message, data = '') => {
    if (isDevelopment) {
      console.warn(message, data);
    }
  }
};

// ========================================
// FUNCIONES DE INTERFAZ
// ========================================

function mostrarRegistro() {
  const loginCard = document.getElementById("loginCard");
  const registerCard = document.getElementById("registerCard");
  
  if (loginCard && registerCard) {
    loginCard.classList.add("oculto");
    registerCard.classList.remove("oculto");
  }
}

function mostrarLogin() {
  const loginCard = document.getElementById("loginCard");
  const registerCard = document.getElementById("registerCard");
  
  if (loginCard && registerCard) {
    registerCard.classList.add("oculto");
    loginCard.classList.remove("oculto");
  }
}

// ========================================
// GESTIÓN DE SESIONES
// ========================================

// Verificar sesión existente al cargar la página
document.addEventListener("DOMContentLoaded", function() {
  logger.log("🚀 Página login cargada - Entorno:", isDevelopment ? 'Desarrollo' : 'Producción');
  logger.log("🌐 API Auth:", API_AUTH);
  
  checkExistingSession();
});

function checkExistingSession() {
  logger.log("🔍 Verificando sesión existente...");
  
  try {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    logger.log("Token:", token ? "Existe" : "No existe");
    logger.log("User:", user ? "Existe" : "No existe");
    
    // Verificación estricta de datos válidos
    if (isValidSession(token, user)) {
      const userData = JSON.parse(user);
      const userName = getUserName(userData);
      
      logger.log("✅ Sesión válida encontrada para:", userName);
      logger.log("🔄 Redirigiendo a index.html...");
      
      // Redirección segura con timeout
      setTimeout(function() {
        window.location.replace("index.html");
      }, isDevelopment ? 1000 : 500); // Menos delay en producción
      
      return true;
    }
    
    logger.log("ℹ️ No hay sesión activa, mostrando formulario de login");
    return false;
    
  } catch (error) {
    logger.error("❌ Error al verificar sesión:", error);
    clearUserSession();
    return false;
  }
}

// Validar que la sesión tenga datos válidos
function isValidSession(token, user) {
  if (!token || token.trim() === "" || !user || user.trim() === "") {
    return false;
  }
  
  try {
    const userData = JSON.parse(user);
    return userData && (userData.nombre || userData.name || userData.email);
  } catch (e) {
    logger.warn("❌ Datos de sesión corruptos, limpiando...");
    clearUserSession();
    return false;
  }
}

// Obtener el nombre del usuario de diferentes formatos
function getUserName(userData) {
  return userData.nombre || userData.name || userData.email || "Usuario";
}

// Limpiar sesión completamente
function clearUserSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // Por si había datos antiguos con otras claves
  localStorage.removeItem("usuario");
}

// ========================================
// AUTENTICACIÓN
// ========================================

// Función de Login
async function login() {
  const email = document.getElementById("loginUsuario");
  const password = document.getElementById("loginPassword");
  
  // Verificar que los elementos existan
  if (!email || !password) {
    showError("Error: No se pudieron encontrar los campos de login");
    return;
  }
  
  const emailValue = email.value.trim();
  const passwordValue = password.value.trim();

  // Validación de campos
  if (!emailValue || !passwordValue) {
    showError("Por favor, ingresa email y contraseña");
    return;
  }

  // Validación básica de email
  if (!isValidEmail(emailValue)) {
    showError("Por favor, ingresa un email válido");
    return;
  }

  logger.log("🔐 Intentando login para:", emailValue);

  try {
    // Mostrar loading (opcional)
    setLoadingState(true);
    
    const res = await fetch(`${API_AUTH}/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        // Headers adicionales para producción si es necesario
      },
      body: JSON.stringify({ 
        email: emailValue, 
        password: passwordValue 
      })
    });

    logger.log("📡 Respuesta del servidor:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error: ${errorText || res.statusText}`);
    }
    
    const data = await res.json();
    logger.log("✅ Login exitoso, datos recibidos");

    // Procesar respuesta del servidor
    const { token, userData } = processLoginResponse(data);
    
    if (!token || !userData) {
      throw new Error("Datos incompletos del servidor");
    }

    // Guardar sesión
    saveUserSession(token, userData);
    
    // Feedback al usuario
    //showSuccess("Login exitoso");
    
    // Redirección
    logger.log("🔄 Redirigiendo a index.html...");
    setTimeout(function() {
      window.location.replace("index.html");
    }, isDevelopment ? 500 : 200);
    
  } catch (err) {
    logger.error("❌ Error en login:", err);
    
    // Mensajes de error más user-friendly en producción
    const errorMessage = isDevelopment 
      ? `Error: ${err.message}`
      : "Usuario o contraseña incorrectos";
      
    showError(errorMessage);
  } finally {
    setLoadingState(false);
  }
}

// Procesar diferentes formatos de respuesta del servidor
function processLoginResponse(data) {
  const token = data.token;
  const userData = data.usuario || data.user || data;
  
  return { token, userData };
}

// Guardar sesión del usuario
function saveUserSession(token, userData) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(userData));
  logger.log("💾 Sesión guardada para:", getUserName(userData));
}

// ========================================
// REGISTRO DE USUARIOS
// ========================================

async function registrar() {
  const nombre = document.getElementById("regNombre");
  const correo = document.getElementById("regCorreo");
  const password = document.getElementById("regPassword");
  
  // Verificar que los elementos existan
  if (!nombre || !correo || !password) {
    showError("Error: No se pudieron encontrar los campos de registro");
    return;
  }
  
  const nombreValue = nombre.value.trim();
  const correoValue = correo.value.trim();
  const passwordValue = password.value.trim();

  // Validaciones
  if (!nombreValue || !correoValue || !passwordValue) {
    showError("Por favor, completa todos los campos");
    return;
  }

  if (!isValidEmail(correoValue)) {
    showError("Por favor, ingresa un email válido");
    return;
  }

  if (passwordValue.length < 6) {
    showError("La contraseña debe tener al menos 6 caracteres");
    return;
  }

  logger.log("📝 Intentando registro para:", correoValue);

  try {
    setLoadingState(true);
    
    const res = await fetch(`${API_AUTH}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        nombre: nombreValue, 
        email: correoValue, 
        password: passwordValue 
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error ${res.status}: ${errorText || res.statusText}`);
    }
    
    const data = await res.json();
    logger.log("✅ Registro exitoso");

    showSuccess("Registro exitoso, ahora puedes iniciar sesión");
    
    // Limpiar campos y mostrar login
    clearRegistrationForm();
    mostrarLogin();
    
  } catch (err) {
    logger.error("❌ Error en registro:", err);
    
    const errorMessage = isDevelopment 
      ? `Error en registro: ${err.message}`
      : "Error al registrarse. Intenta con otro email.";
      
    showError(errorMessage);
  } finally {
    setLoadingState(false);
  }
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

// Validación de email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Mostrar mensajes de error
function showError(message) {
  alert(message); // En producción podrías usar un modal más elegante
}

// Mostrar mensajes de éxito
function showSuccess(message) {
  alert(message); // En producción podrías usar un modal más elegante
}

// Estado de loading (opcional - puedes expandir esto)
function setLoadingState(isLoading) {
  // Aquí podrías deshabilitar botones, mostrar spinners, etc.
  logger.log(isLoading ? "🔄 Loading..." : "✅ Loading complete");
}

// Limpiar formulario de registro
function clearRegistrationForm() {
  const fields = ["regNombre", "regCorreo", "regPassword"];
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) field.value = "";
  });
}