# Metodología de Desarrollo — Academia PayGas

*Actualizado con la documentación completa del proyecto (arquitectura, roles, workflow diario, seguridad y despliegue real en cPanel).*

## 1. Qué es el sistema

Academia PayGas es una plataforma de capacitación corporativa (LMS) para empleados de estaciones de servicio PayGas. Permite que los administradores creen cursos, los gestores organicen a sus equipos, y los empleados (y ahora también socios externos) tomen los cursos, respondan quizzes y obtengan certificados. Todo esto envuelto en un sistema de gamificación (puntos, niveles, ranking) para incentivar la participación.

Técnicamente es una aplicación web de una sola página (React) conectada a una API (Express/Node.js), con una base de datos principal en PostgreSQL y capas de respaldo (otra Postgres, MySQL). Se despliega en un servidor cPanel con nginx.

Este documento explica **cómo abordar el desarrollo de un sistema de este tipo**, tanto a nivel de plan general (qué construir y en qué orden) como a nivel de rutina diaria (cómo se aborda cada tarea concreta), sin entrar en detalles de código, para que sirva de guía de planificación y de referencia mientras se construye.

---

## 2. Fundamentos antes de empezar

Antes de escribir una sola línea de código conviene tener claridad sobre estos puntos, porque cambiarlos a mitad de camino sale caro:

- **Entender a los usuarios y sus roles.** Este sistema terminó teniendo cinco roles con permisos muy distintos: Administrador, Gestor de equipo, Empleado (Atendente), Socio Acreditado y Representante de un sistema externo (ERP). Cada pantalla y cada endpoint de la API depende de "quién está preguntando". Definir los roles desde el inicio —aunque luego se agreguen más— evita rehacer toda la lógica de permisos más adelante.
- **No asumir que la lista de roles es fija.** En este proyecto se empezó con 3 roles y luego se agregaron 2 más sin tener que rehacer el sistema, porque los permisos no estaban "quemados" en el código sino manejados por un motor de reglas configurable. Vale la pena invertir en esto desde el principio si se espera que el negocio evolucione.
- **Definir el vocabulario del negocio.** Aquí un "Curso" se llama internamente "Curso" en la base de datos, y contiene "Aulas", que a su vez contienen "Licoes". Ponerse de acuerdo en los nombres —y documentar la equivalencia entre el nombre técnico y el nombre visible— evita confusión entre quien diseña, quien programa el backend y quien programa el frontend.
- **Decidir el idioma de la interfaz.** Todo el texto visible y buena parte de los nombres de variables se manejan en portugués de Brasil. Esto se define una sola vez al inicio.
- **Elegir el stack tecnológico y justificarlo.** No es necesario copiar exactamente React + Express + PostgreSQL, pero sí conviene fijar: lenguaje de programación, framework de frontend, framework de backend, motor de base de datos, y cómo se van a comunicar entre sí (API REST, en este caso).
- **Decidir el nivel de redundancia que necesita el negocio.** Este sistema usa varias bases PostgreSQL en paralelo más una base MySQL de respaldo, porque no puede permitirse caídas. Si el proyecto no tiene ese requisito, conviene simplificar desde el principio; agregar redundancia después es más difícil que quitarla.
- **Tener un lugar único de verdad para la documentación.** Este proyecto mantiene una carpeta dedicada solo a documentación para quien desarrolla (arquitectura, reglas de código, flujo de trabajo, seguridad, despliegue, etc.), separada de la documentación general del producto. Mantenerla actualizada desde el día uno ahorra tiempo cuando el equipo crece o cuando se retoma el proyecto meses después.
- **Definir cómo se va a organizar y descubrir el código a medida que crece.** En proyectos grandes, buscar código "a ojo" se vuelve lento. Conviene decidir desde el principio qué herramientas se usarán para indexar y navegar el código (búsqueda de texto, búsqueda de símbolos, o incluso un índice de arquitectura consultable), y mantener ese índice actualizado.

---

## 3. Metodología general (el plan completo del proyecto)

El desarrollo se organiza en **etapas incrementales**, donde cada etapa entrega algo funcional y comprobable, en lugar de construir todo el sistema de una vez y probarlo al final. El orden importa: primero se construye lo que todo lo demás necesita (autenticación, base de datos), después la funcionalidad principal (cursos y aprendizaje), y al final las capas de refuerzo (gamificación, foro, reportes) y la puesta en producción.

A grandes rasgos, las etapas son:

```
0. Descubrimiento y planificación
1. Cimientos técnicos (infraestructura, base de datos, autenticación y roles)
2. Núcleo del backend (API y reglas de negocio)
3. Interfaz base (layout, navegación, sistema de diseño)
4. Funcionalidad principal (cursos, aulas, licoes, quizzes, certificados)
5. Motivación y comunidad (gamificación, ranking, foro, notificaciones)
6. Administración y reportes (analítica, gestión de equipos, paneles)
7. Seguridad y calidad (hardening, pruebas)
8. Despliegue y operación
9. Mantenimiento y mejora continua
```

Esto responde a **qué construir**. La sección 4 detalla cada etapa. La sección 5, más abajo, responde a una pregunta distinta pero igual de importante: **cómo se trabaja el día a día**, tarea por tarea, dentro de cualquiera de estas etapas.

---

## 4. Etapas del desarrollo

### Etapa 0 — Descubrimiento y planificación

- Levantar los requerimientos con quien pidió el sistema: qué tipos de usuario existen (incluyendo actores externos como socios o sistemas de terceros, no solo empleados internos), qué contenido se va a enseñar, cómo se mide el progreso, y qué reportes necesita la gerencia.
- Dibujar el mapa de pantallas (qué ve cada rol) y el mapa de rutas de navegación.
- Diseñar el modelo de datos en un diagrama simple: qué entidades existen (Usuario, Curso, Aula, Licao, Quiz, Certificado, etc.) y cómo se relacionan entre sí.
- Definir los roles y, para cada uno, qué puede crear, ver, editar y borrar, y sobre qué "recursos" (usuarios, cursos, certificados, reportes). Esto se vuelve la base del sistema de permisos.
- Elegir el proveedor de hosting y base de datos, considerando el presupuesto y la tolerancia a fallos requerida.

**Entregable de esta etapa:** un documento de arquitectura con el mapa de roles, el mapa de pantallas, la matriz de permisos (qué rol puede hacer qué sobre qué recurso) y el modelo de datos, antes de tocar código.

### Etapa 1 — Cimientos técnicos

- Preparar el repositorio de código con la estructura de carpetas (frontend, backend, recursos compartidos entre ambos).
- Configurar las herramientas base: gestor de paquetes, formateador/linter de código, y el entorno de desarrollo local. Fijar de una vez las reglas de estilo (tabs o espacios, comillas, etc.) para que no se discutan en cada revisión de código.
- Modelar y crear la base de datos: definir las tablas, sus relaciones, e índices para las consultas más frecuentes (por ejemplo, buscar el progreso de un usuario en un curso).
- Construir el sistema de autenticación: registro, inicio de sesión, verificación de correo, y generación de tokens de sesión.
- **Construir el sistema de permisos como un motor configurable, no como condicionales sueltos por el código.** La recomendación, con la experiencia de este proyecto, es centralizar las reglas de "quién puede hacer qué" en un solo lugar del backend (una librería de control de acceso basada en roles y atributos), y que ese backend sea siempre la fuente de verdad. El frontend puede tener su propia copia simplificada de las reglas solo para decidir qué mostrar u ocultar visualmente, pero nunca para la seguridad real.
- Guardar la configuración de roles y permisos en la base de datos en vez de "quemarla" en el código, para poder agregar un rol nuevo (como pasó en este proyecto) sin tocar la lógica interna, solo agregando un registro.
- Sembrar (poblar) la base de datos con usuarios de prueba de cada rol, para poder probar el sistema desde el día uno sin depender de datos reales.

**Consideración clave:** toda la autorización debe resolverse en el servidor. La interfaz solo oculta opciones por comodidad visual; si alguien manipula las peticiones directamente, el backend debe seguir bloqueando lo que no le corresponde.

### Etapa 2 — Núcleo del backend

- Construir una capa única de acceso a datos (un solo lugar del código que hable con la base de datos), en vez de que cada parte del sistema haga sus propias consultas. Esto facilita cambiar de motor de base de datos, agregar respaldos, o auditar accesos después. Es una de las decisiones que más facilita el mantenimiento a largo plazo.
- Definir las rutas de la API agrupadas por tema (usuarios, cursos, progreso, certificados, notificaciones, etc.), cada una protegida según el rol y, si aplica, según la acción específica sobre ese recurso (no es lo mismo "poder ver certificados" que "poder aprobarlos y emitirlos").
- Establecer el formato estándar de respuestas y de manejo de errores, para que el frontend siempre sepa qué esperar.
- Si el sistema maneja datos sensibles (contraseñas, datos personales), incorporar cifrado de la comunicación entre cliente y servidor desde esta etapa, no al final. Definir con claridad en qué momento el cliente obtiene la llave de cifrado (normalmente antes del login, ya que las credenciales también viajan cifradas) y qué información puede exponerse en un endpoint público sin comprometer la seguridad.
- Configurar registro de actividad (logs) de las acciones importantes: quién inició sesión, quién creó o editó qué, y cuándo. Esto es indispensable para auditoría y para depurar problemas más adelante.
- Centralizar el envío de correos en un solo servicio interno, con un proveedor principal y uno de respaldo en caso de que el primero falle, en vez de enviar correos desde distintas partes del código.

### Etapa 3 — Interfaz base

- Definir el sistema de diseño antes de construir pantallas: paleta de colores de marca, tipografía, espaciados, y componentes reutilizables (tarjetas, botones, tablas, formularios). Tenerlo documentado evita que cada pantalla se vea "distinta" y facilita incorporar gente nueva al equipo.
- Construir el layout general: cabecera, barra lateral de navegación (que cambia según el rol y los módulos activos), y área de contenido.
- Implementar el inicio de sesión y la protección de rutas (que un usuario no autenticado, o sin el rol/permiso adecuado, no pueda entrar a una pantalla escribiendo la URL directamente).
- Dejar preparado un mecanismo para activar o desactivar secciones completas del menú desde el panel de administración, si el negocio lo requiere (útil cuando se lanza el sistema por fases).
- Si los roles y sus etiquetas visuales (nombre mostrado, color, ícono) pueden cambiar con el tiempo, conviene que también vengan de configuración en vez de estar fijos en el código de la interfaz.

### Etapa 4 — Funcionalidad principal (el corazón del sistema)

Esta es la etapa más grande porque es la razón de ser del sistema: el aprendizaje.

- Construir el panel de gestión de contenido (CMS) donde el administrador crea Cursos, y dentro de cada curso, Aulas, y dentro de cada aula, Licoes (video, texto o PDF) y, opcionalmente, un Quiz.
- Construir la vista del alumno: listado de cursos disponibles, vista de un curso con sus aulas, y el reproductor/lector de cada lección.
- Implementar el registro de progreso: qué lecciones completó cada usuario, para poder retomar donde se quedó y para que los reportes reflejen avance real.
- Implementar el quiz con calificación automática y una nota mínima de aprobación.
- Implementar la generación de certificados cuando el usuario aprueba un curso, con un flujo de estados (pendiente, aprobado, emitido) si se requiere revisión humana antes de emitirlo.

**Consideración clave:** conviene definir con mucha claridad la jerarquía de contenido (Curso → Aula → Licao → Quiz) y respetarla en todo el sistema. Cambiar esta jerarquía a mitad de desarrollo obliga a rehacer base de datos, backend y frontend a la vez.

### Etapa 5 — Motivación y comunidad

- Sistema de puntos (XP): definir qué acciones otorgan puntos (iniciar sesión, completar una lección, aprobar un quiz, obtener un certificado, etc.) y cómo se calculan los niveles. Conviene que los valores de puntos sean configurables desde un panel, no fijos en el código, para poder ajustar el balance del juego sin desplegar cambios.
- Ranking o tabla de posiciones, para fomentar competencia sana entre usuarios o entre regiones.
- Insignias o logros desbloqueables, si el negocio quiere reforzar la motivación más allá de los puntos.
- Foro o espacio de comunidad, si se busca que los usuarios interactúen entre sí (publicaciones, comentarios, "me gusta").
- Notificaciones dentro de la aplicación y por correo electrónico, para avisar de nuevos cursos, certificados emitidos, o actividad relevante.

Esta etapa se puede desarrollar en paralelo con la Etapa 6, ya que ambas dependen del núcleo (Etapa 4) pero no dependen entre sí.

### Etapa 6 — Administración y reportes

- Gestión de equipos: que un gestor solo vea y administre a las personas a su cargo, y que el administrador vea todo.
- Paneles de analítica: progreso por curso, por persona, por región, según lo que necesite la gerencia.
- Reportes descargables o imprimibles para gestores y administradores, y considerar si algún rol necesita exportar datos hacia sistemas externos (por ejemplo, un ERP).
- Paneles ejecutivos o "nacionales" con métricas globales, si el negocio opera en varias zonas o sucursales.

### Etapa 7 — Seguridad y calidad

No es una etapa que se hace "al final y ya", pero conviene una revisión formal antes de salir a producción. Estos son los puntos que, en la práctica, terminaron necesitando corrección en este proyecto y por eso vale la pena verificarlos desde el diseño:

- **Nunca dejar llaves de cifrado o secretos fijos en el código ni en el paquete que se envía al navegador.** Si el frontend necesita una llave para cifrar datos antes de enviarlos, debe pedirla al servidor en tiempo de ejecución, y el servidor debe poder generarla automáticamente si no fue configurada manualmente.
- **Cuidado con los endpoints "públicos por necesidad".** A veces el cliente necesita cierta información antes de poder autenticarse (por ejemplo, una llave para cifrar el usuario y contraseña del login). Eso está bien, pero hay que asegurarse de que esa información por sí sola no dé acceso a nada; la seguridad real debe seguir dependiendo de la sesión autenticada.
- **Limitar la cantidad de intentos** en endpoints sensibles: inicio de sesión (para evitar fuerza bruta) y registro de usuarios nuevos (para evitar abuso o spam de cuentas).
- **Validar los roles en el propio backend al crear usuarios.** Un error común es permitir que un rol intermedio (como un gestor) cree usuarios con un rol superior al suyo. Cada operación de creación debe validar explícitamente qué roles puede asignar quién.
- **Poner fecha de expiración a cualquier token de verificación o de recuperación** (de correo, de contraseña, etc.). Un token que nunca expira es un riesgo de seguridad silencioso.
- **Generar automáticamente secretos fuertes si no se configuran manualmente**, y rechazar (o regenerar) los que sean demasiado cortos o predecibles.
- Configurar cabeceras de seguridad HTTP estándar y una lista blanca de dominios permitidos para las peticiones entre frontend y backend (CORS).
- Revisar que ninguna credencial (contraseñas de base de datos, llaves secretas) quede expuesta en el código fuente ni en el historial de control de versiones; si ya quedó expuesta alguna vez, limpiar el historial y rotar esas credenciales, no solo corregir el código hacia adelante.
- Documentar en un solo lugar todas las variables de entorno necesarias, indicando cuáles son obligatorias y cuáles son sensibles, para que cualquier persona nueva pueda configurar su entorno sin exponer nada por error.
- Hacer una revisión manual del flujo completo con cada rol antes del lanzamiento, no solo con el rol administrador.

### Etapa 8 — Despliegue y operación

- Definir el entorno de producción: proveedor de hosting, dominio, certificado SSL.
- Automatizar el proceso de despliegue en un solo script repetible: bajar el código más reciente, generar los clientes de base de datos, aplicar migraciones, compilar frontend y backend, y reiniciar el servicio.
- **Si el hosting usa un servidor web como nginx delante de la aplicación, configurar explícitamente el "puente" (proxy reverso) entre ese servidor web y la aplicación.** Sin este paso, el navegador puede terminar recibiendo la página principal en vez de la respuesta de la API, y el error es confuso de diagnosticar si no se sabe qué buscar. Conviene automatizar también esta configuración como parte del script de despliegue, y no dejarla como paso manual que se olvida.
- Elegir el método de despliegue según el nivel de automatización deseado: manual (subir archivos y configurar todo a mano, más simple pero más propenso a error humano), o automático vía control de versiones (cada cambio subido a la rama principal dispara el despliegue solo).
- Definir variables de entorno de producción por separado de las de desarrollo, y no compartir credenciales entre ambos entornos.
- Verificar con una prueba simple después de cada despliegue (por ejemplo, un endpoint de salud que no exponga información sensible) que el sistema esté realmente funcionando antes de darlo por bueno, probando tanto el acceso directo al servidor de la aplicación como el acceso a través del dominio público.
- Antes de dar por cerrado un despliegue a producción, limpiar archivos temporales o de prueba que hayan quedado en el repositorio (scripts de prueba, análisis generados, paquetes duplicados), ya que suelen acumularse durante el desarrollo y no deben viajar a producción.

### Etapa 9 — Mantenimiento y mejora continua

- Mantener actualizada la documentación técnica a medida que el sistema cambia; un documento desactualizado es peor que no tener documento.
- Revisar periódicamente los registros de actividad y de errores para detectar problemas antes de que los reporten los usuarios.
- Priorizar nuevas funcionalidades con base en datos reales de uso (qué módulos se usan más, dónde abandonan los usuarios el curso, etc.).
- Planificar rotación de credenciales y respaldos de base de datos de forma regular, no solo cuando ocurre un incidente.
- Revisar de tanto en tanto si el sistema de permisos sigue reflejando la realidad del negocio, especialmente si aparecen nuevos tipos de usuario (como ocurrió al incorporar socios externos y representantes de sistemas de terceros).

---

## 5. Metodología de trabajo diario (cómo se aborda cada tarea)

Más allá del plan general del proyecto, es útil tener un **flujo de trabajo repetible para cada tarea individual** (una funcionalidad nueva, una corrección de error, un cambio de diseño). Este flujo funciona igual de bien si lo sigue una persona o un equipo, y evita el error común de "empezar a programar directamente" sin entender bien el problema o sin revisar si ya existe algo parecido.

### Los 10 pasos de una tarea

1. **Comprender el objetivo.** Leer con calma qué se pide, identificar el objetivo real (no solo lo literal), y preguntar si algo es ambiguo antes de avanzar.
2. **Revisar el contexto existente del proyecto.** Antes de tocar nada, entender cómo está construida la parte del sistema que se va a modificar: qué patrones ya existen, qué decisiones se tomaron antes y por qué.
3. **Buscar código o soluciones ya existentes.** Es muy probable que un problema parecido ya se haya resuelto en otra parte del sistema; reutilizar en vez de reinventar ahorra tiempo y mantiene la consistencia.
4. **Analizar el impacto del cambio.** Antes de escribir código, preguntarse: ¿esto rompe algo que ya funciona? ¿afecta el rendimiento? ¿abre un riesgo de seguridad? ¿necesita un cambio en la base de datos? ¿toca frontend y backend a la vez? ¿hay que actualizar documentación?
5. **Registrar la tarea formalmente si es de tamaño considerable.** Para cambios grandes (varias pantallas o archivos, una funcionalidad completa, una corrección compleja), conviene anotarla en una lista de tareas con su prioridad y su estado, en vez de llevarla solo "en la cabeza".
6. **Elaborar un plan por escrito antes de programar**, con: el objetivo, los archivos o partes del sistema que se van a tocar, los riesgos identificados y cómo mitigarlos, y el orden de implementación.
7. **Implementar en cambios pequeños y verificables.** Dividir el trabajo en partes chicas, implementar una, verificar que funciona, y recién ahí seguir con la siguiente. Evita acumular errores difíciles de rastrear.
8. **Ejecutar las validaciones del proyecto**, como mínimo: revisar el estilo del código, verificar que no haya errores de tipos, y confirmar que el proyecto compila. Si hay cambios de base de datos, aplicarlos y confirmarlos.
9. **Actualizar la documentación** si el cambio afecta la arquitectura, agregar comentarios solo donde la lógica sea realmente compleja, y usar un formato de mensaje de commit consistente.
10. **Cerrar la tarea solo cuando**: el código compila sin errores, las pruebas (si existen) pasan, no hay errores de estilo, y la documentación quedó al día.

### Cómo manejar los tropiezos

- **Si algo falla:** identificar el error con calma, rastrear la causa raíz (no solo "parchar" el síntoma), revisar si ya se documentó un problema parecido antes, probar una solución mínima, y dejar registro de cómo se resolvió para la próxima vez.
- **Si hay un bloqueo real:** comunicarlo con claridad a quien corresponda, proponer alternativas, y mientras tanto avanzar en otra parte del trabajo que no dependa de ese bloqueo.

### Casos especiales dentro del flujo

- **Corrección de errores (bugs):** primero lograr reproducir el error de forma confiable, después rastrear la causa raíz, aplicar la corrección más mínima posible (evitar aprovechar para "arreglar" cosas no relacionadas), y verificar que no se rompió nada más.
- **Funcionalidad nueva:** entender bien la necesidad de negocio antes de diseñar la solución, apuntar a la versión más simple que resuelva el problema, implementar por partes, y documentar la funcionalidad al terminar.
- **Refactorización (reordenar código sin cambiar su comportamiento):** entender bien el código actual antes de tocarlo, hacer los cambios en pasos chicos, y verificar en cada paso que el comportamiento externo sigue siendo el mismo.
- **Cambios de base de datos:** diseñar el cambio, generar la migración correspondiente, aplicarla primero en desarrollo, actualizar el código que depende de ese modelo de datos, verificar que no se rompe nada que dependía de la estructura anterior, y documentar el cambio.

---

## 6. Herramientas de apoyo recomendadas

Independientemente de cuáles herramientas específicas se elijan, conviene cubrir estas cuatro funciones desde el inicio del proyecto:

- **Gestión de tareas.** Un lugar único donde quede registrado qué se va a hacer, con qué prioridad y en qué estado (pendiente, en curso, hecho, bloqueada). Ayuda especialmente cuando el trabajo se retoma después de una pausa, o cuando lo hace más de una persona.
- **Descubrimiento de código.** A medida que el proyecto crece, buscar "a mano" se vuelve lento y poco confiable. Conviene apoyarse en herramientas de búsqueda de texto rápidas, búsqueda de archivos, y —idealmente— algún tipo de índice o mapa del código que permita preguntar cosas como "qué le llama a esta función" o "cuál es la arquitectura general", en vez de leer archivo por archivo.
- **Registro de decisiones y patrones.** Cuando se toma una decisión técnica importante (por qué se eligió tal enfoque y no otro) o se descubre un patrón reutilizable, vale la pena dejarlo escrito en algún lugar consultable, para no perder ese conocimiento ni tener que redescubrirlo más adelante.
- **Verificación automatizada mínima**, aunque sea simple: un comando que revise el estilo del código, otro que confirme que no hay errores de tipos, y una forma rápida de comprobar que el sistema realmente responde después de un cambio (por ejemplo, una ruta de "estado de salud" que no exponga información sensible).

---

## 7. Convenciones de código (para mantener consistencia en el tiempo)

Estas reglas no son sobre "qué construir" sino sobre "cómo escribirlo", y su valor está en aplicarlas desde el primer archivo, no en corregir todo el proyecto después:

- **Un solo estilo de formato de código**, aplicado con una herramienta automática en vez de dejarlo al criterio de cada persona (tabulaciones o espacios, tipo de comillas, largo máximo de línea, etc.).
- **Convenciones de nombres claras y documentadas**: cómo se nombran funciones, componentes visuales, constantes y archivos, y en qué idioma se escriben los textos visibles y los identificadores del código.
- **Un único camino para acceder a los datos.** Nunca dejar que distintas partes del sistema hablen con la base de datos cada una a su manera; siempre a través de la capa de acceso a datos centralizada.
- **Reglas de seguridad no negociables**, documentadas explícitamente: nunca exponer secretos en el código, nunca desactivar la verificación de identidad, nunca validar solo del lado del cliente, siempre usar consultas parametrizadas (nunca construir consultas SQL pegando texto).
- **Anti-patrones a evitar activamente**: código duplicado, reinventar algo que ya existe en el proyecto, optimizar antes de que haga falta, complicar una solución que podía ser simple, valores fijos en el código que deberían venir de configuración, e ignorar los avisos del sistema de tipos.
- **Un formato estándar para los mensajes de control de versiones** (por ejemplo: tipo de cambio + descripción corta), y el hábito de registrar cada cambio con su propio mensaje descriptivo en vez de acumular cambios sin documentar.

---

## 8. Consideraciones transversales (aplican en todas las etapas)

- **Consistencia de nombres.** Si un mismo concepto tiene un nombre técnico (por ejemplo, en la base de datos) y un nombre visible para el usuario (por ejemplo, en la interfaz), hay que documentar esa equivalencia en un solo lugar para que nadie se confunda al leer el código o al hablar con el cliente.
- **Un solo punto de acceso a los datos.** Evitar que distintas partes del sistema accedan a la base de datos de formas diferentes; esto facilita mantener consistencia, especialmente si hay más de una base de datos (principal y respaldo).
- **Los permisos se validan en el servidor, siempre.** La interfaz puede ocultar botones, pero la seguridad real vive en el backend.
- **Los roles y permisos deben poder evolucionar sin reescribir código.** Guardarlos en configuración/base de datos en vez de fijarlos en el código permite que el negocio agregue roles nuevos con bajo costo técnico.
- **Trabajar en incrementos pequeños y verificables.** Cada etapa —y cada tarea dentro de ella— debe dejar algo que se pueda probar de punta a punta antes de pasar a la siguiente.
- **Registrar cambios de forma disciplinada.** Guardar cada cambio con un mensaje claro de qué se hizo y por qué, y aplicar ese hábito desde el primer día, no cuando el proyecto ya es grande.
- **Separar entorno de desarrollo y de producción.** Usar datos de prueba en desarrollo, nunca datos reales de usuarios, y mantener credenciales distintas para cada entorno.
- **Pensar en el crecimiento del equipo.** Documentar decisiones de arquitectura (por qué se eligió tal base de datos, tal framework, tal motor de permisos) para que alguien nuevo pueda entender el sistema sin depender de preguntar a quien lo construyó.
- **Prever que la infraestructura de producción se comporta distinto que la de desarrollo.** Cosas como redundancia de base de datos, chequeos de salud periódicos, o el proxy del servidor web, suelen estar desactivadas o simplificadas en desarrollo por practicidad; documentar claramente esa diferencia evita sorpresas al desplegar.

---

## 9. Resumen visual del orden recomendado

```
Descubrimiento
      │
      ▼
Cimientos técnicos (BD + Auth + Roles configurables)
      │
      ▼
Núcleo del backend (API + permisos + cifrado + logs)
      │
      ▼
Interfaz base (diseño + navegación)
      │
      ▼
Funcionalidad principal (cursos/aprendizaje)
      │
      ├──────────────┐
      ▼              ▼
Motivación/comunidad   Administración/reportes
      │              │
      └──────┬───────┘
             ▼
   Seguridad y calidad
             │
             ▼
   Despliegue a producción (con proxy y verificación)
             │
             ▼
   Mantenimiento continuo
```

Cada tarea dentro de cualquiera de estas etapas debería, a su vez, recorrer el ciclo descrito en la sección 5 (entender → revisar contexto → planear → implementar en pequeño → verificar → documentar). El plan general dice **qué** construir y en qué orden; el flujo diario dice **cómo** construir cada pieza sin acumular deuda técnica ni sorpresas de seguridad.

Este orden no es rígido: algunas etapas se pueden solapar (por ejemplo, empezar el sistema de diseño mientras se termina la base de datos), pero respetar la dependencia lógica —primero lo que sostiene al resto, después lo que da valor al usuario, y al final lo que refuerza y pule— reduce el riesgo de tener que rehacer trabajo ya avanzado.
