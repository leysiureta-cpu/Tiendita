# Codificación del frontend de la aplicación web

Mini Súper es una aplicación web de punto de venta para administrar productos, inventario, ventas y reportes. La interfaz incluye módulos para autenticarse y operar las funciones disponibles desde un navegador.

## Objetivo de la aplicación

> Nuestro objetivo es agilizar y mejorar el cobro de la tienda usando la página web que desarrollamos. Con este sistema evitamos que los productos se dupliquen y aseguramos cuentas exactas, logrando atender rápido y sin fallas desde cualquier navegador.

## Integrantes del equipo

- Leysi Deniss Ureta Favela
- Rosmery Espinoza Rocha
- Santos Alberto Rivera Salinas
- Mekina Avigail Castro Urias

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

Requisitos: Git, Node.js y npm.

```bash
git clone https://github.com/leysiureta-cpu/Tiendita.git
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

- **Inicio de sesión y registro:** formularios de acceso y alta de usuario, con validación de datos y confirmación de contraseña.
- **Dashboard:** resumen de productos, existencias, ventas del día y productos más vendidos; los datos se calculan a partir de la información disponible en el navegador.
- **Productos:** alta, consulta, búsqueda, filtro por categoría, orden alfabético, paginación, detalle, edición y eliminación.
- **Inventario:** consulta y búsqueda de productos por nombre, categoría o identificador, con precio y existencias.
- **Punto de venta y carrito:** búsqueda y selección de productos, ajuste de cantidades y descuento, cálculo de subtotal y total, selección de efectivo/tarjeta/transferencia y validación de stock. La pantalla permite confirmar los pagos con tarjeta o transferencia, pero no procesa pagos bancarios.
- **Ventas:** registro de ventas, actualización de existencias, historial y consulta e impresión de comprobantes.
- **Reportes:** resumen de ventas por rango de fechas y almacenamiento de reportes para consultarlos posteriormente.
- **Perfil y preferencias:** consulta de datos de la cuenta, carga o eliminación de foto de perfil y ajustes de apariencia (tema y paleta de color).
- **Navegación protegida:** las secciones de la aplicación requieren una sesión iniciada.

Los datos de usuarios, productos, ventas, preferencias y reportes se guardan en el almacenamiento local (`localStorage`) del navegador; no se observa una conexión a un servicio backend en el código actual. El carrito se mantiene durante la operación actual y no se conserva como carrito persistente.

### Secciones en preparación

Las rutas de categorías, clientes, proveedores, compras y caja están presentes en la navegación, pero actualmente muestran una pantalla de “Sección en preparación”. No se describen como funcionalidades terminadas.

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
