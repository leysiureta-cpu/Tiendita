# Codificación del frontend de la aplicación web

Mini Súper es una aplicación web de punto de venta para administrar productos, inventario, ventas y reportes. La interfaz incluye módulos para autenticarse y operar las funciones disponibles desde un navegador.

## Objetivo de la aplicación

> Nuestro objetivo es agilizar y mejorar el cobro de la tienda usando la página web que desarrollamos. Con este sistema evitamos que los productos se dupliquen y aseguramos cuentas exactas, logrando atender rápido y sin fallas desde cualquier navegador.

## Integrantes del equipo

- Leysi Deniss Ureta Favela
- Rosmery Espinoza Rocha
- Santos Alberto Rivera Salinas
- Melina Avigail Castro Urias

## Tecnologías y bibliotecas utilizadas

La aplicación está en `mi-aplicacion/`. Estas tecnologías y dependencias aparecen en su `package.json`:

### Aplicación

- **JavaScript (ES modules)** y **JSX**.
- **React 19** y **React DOM 19** para la interfaz.
- **React Router DOM 7** para la navegación.
- **Lucide React** para los iconos.
- **Vite 8** como servidor de desarrollo y herramienta de compilación.

### Herramientas y dependencias de desarrollo

- **@vitejs/plugin-react** para la integración de React con Vite.
- **ESLint**, **@eslint/js**, **eslint-plugin-react-hooks** y **eslint-plugin-react-refresh** para revisar el código.
- **globals** para las definiciones de entornos de ESLint.
- **@types/react** y **@types/react-dom** para definiciones de tipos; la aplicación está escrita en JavaScript/JSX.

Las versiones indicadas son las declaradas en `mi-aplicacion/package.json`; `package-lock.json` registra la resolución concreta instalada.

## Instalación y ejecución

Requisitos: Git, Node.js/npm, PHP y Composer. Laravel se encuentra en `backend/` y
React/Vite en `mi-aplicacion/`. Configura la conexión local de MySQL en
`backend/.env` sin subir credenciales al repositorio, y ejecuta la migración
aditiva pendiente con `php artisan migrate` desde `backend/`. Ejecuta también
`php artisan storage:link` para servir las fotografías de perfil.

```bash
git clone https://github.com/leysiureta-cpu/Tiendita.git
cd Tiendita/backend
composer install
php artisan serve
```

En otra terminal, inicia el frontend:

```bash
cd Tiendita/mi-aplicacion
npm install
npm run dev
```

Vite muestra en la terminal la dirección local del servidor (normalmente `http://localhost:5173`). Para compilar la aplicación o revisar la compilación localmente:

```bash
npm run build
npm run preview
```

El proyecto también incluye `npm run lint` para ejecutar ESLint.

## Funcionalidades implementadas

- **Inicio de sesión y registro:** empleados se registran como Cajeros; crear una cuenta Administrador requiere un código de autorización validado únicamente por Laravel.
- **Dashboard:** resumen de productos, existencias, ventas del día y productos más vendidos consultados desde Laravel.
- **Productos:** consulta para ambos roles; alta, edición y eliminación protegidas para Administradores.
- **Inventario:** consulta desde MySQL; los cambios de existencias se validan y guardan en Laravel.
- **Punto de venta y carrito:** búsqueda y selección de productos, ajuste de cantidades y descuento, cálculo de subtotal y total, selección de efectivo/tarjeta/transferencia y validación de stock. La pantalla permite confirmar los pagos con tarjeta o transferencia, pero no procesa pagos bancarios.
- **Ventas:** Laravel registra cada operación y actualiza stock en una transacción. Los cajeros solo pueden consultar ventas propias; los administradores pueden consultar todas. Se conservan historial y comprobantes.
- **Reportes:** acceso exclusivo para Administradores; se calculan en Laravel desde las ventas almacenadas.
- **Empleados:** los Administradores buscan, consultan, registran y editan cuentas Cajero, y pueden activarlas o desactivarlas. La sección usa la tabla `usuarios`; no elimina cuentas ni sus ventas históricas.
- **Usuarios y roles:** Administradores gestionan cuentas, asignan los roles existentes y activan/desactivan usuarios. El servidor impide cambiar el rol propio y protege también los endpoints.
- **Perfil y preferencias:** consulta de datos de la cuenta, carga o eliminación de foto de perfil y ajustes de apariencia (tema y paleta de color).
- **Navegación protegida:** requiere sesión; React oculta secciones no autorizadas y Laravel aplica la autorización real.

Los productos, usuarios, ventas y preferencias de perfil se gestionan mediante Laravel y MySQL. Tema, paleta y encuadre se guardan asociados a cada usuario; las fotografías se almacenan en el disco público de Laravel y se validan en el servidor. Las preferencias antiguas del navegador se migran al servidor al iniciar sesión, sin borrar los datos locales. Los antiguos registros de productos y ventas en `localStorage` se conservan intactos en cada navegador, pero no se importan automáticamente ni se usan para autorizar o registrar nuevas operaciones. El carrito se mantiene durante la operación actual.

Configura `ADMIN_REGISTRATION_CODE` en `backend/.env` para habilitar el registro de Administradores. La variable está vacía en `backend/.env.example`; no publiques el código ni lo incluyas en el frontend. Cambia el valor local de pruebas antes de desplegar la aplicación.

Como alternativa, para asignar el rol Administrador desde la consola del servidor, ejecuta desde `backend/`:

```bash
php artisan mini-super:promote-admin correo@example.com
```

El comando solo funciona desde la consola del servidor y no cambia contraseñas. Los roles Administrador y Cajero son los dos registros existentes en `roles`; no se crean roles dinámicos.

### Secciones en preparación

Clientes, proveedores, compras y caja siguen mostrando una pantalla de “Sección en preparación”.

## Estado actual del desarrollo

Mini Súper se encuentra en desarrollo y sus módulos están en proceso de integración y pruebas. Algunas operaciones de frontend ya están implementadas; las secciones indicadas como “en preparación” aún están pendientes.

## Créditos y referencias

- [React](https://react.dev/)
- [React DOM](https://react.dev/reference/react-dom)
- [React Router](https://reactrouter.com/)
- [Lucide](https://lucide.dev/)
- [Vite](https://vite.dev/)
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)
- [ESLint](https://eslint.org/)
- [@eslint/js](https://www.npmjs.com/package/@eslint/js)
- [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [eslint-plugin-react-refresh](https://www.npmjs.com/package/eslint-plugin-react-refresh)
- [globals](https://github.com/sindresorhus/globals)
- [@types/react y @types/react-dom](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types)

## Seguridad del repositorio

No subas contraseñas, tokens, claves privadas ni información sensible al repositorio. Usa variables de entorno para la configuración local y mantén los archivos que las contengan fuera del control de versiones. Asegúrate de excluir, como mínimo, estos archivos y directorios mediante `.gitignore`:

```gitignore
.env
.env.local
node_modules/
dist/
```

El `.gitignore` de `mi-aplicacion/` ya contiene reglas para excluir archivos `.env`, `node_modules` y `dist`; revísalo si cambian las necesidades del proyecto.
