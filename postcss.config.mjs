// const config = {
//   plugins: ["@tailwindcss/postcss"],
// };

// export default config;

// Modify for deployment purposes
// postcss.config.js
import { join } from 'path';

const config = {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss: {
      config: join(__dirname, 'tailwind.config.ts')
    },
    autoprefixer: {},
  },
};

export default config;
