// const config = {
//   plugins: ["@tailwindcss/postcss"],
// };

// export default config;

// Modify for deployment purposes
// postcss.config.js
// postcss.config.mjs
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Create __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// With nesting plugin
const config = {
  plugins: {
    'postcss-nesting': {},
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;