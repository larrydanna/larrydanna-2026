// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://larrydanna.com',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      langs: ['javascript', 'typescript', 'sql', 'csharp', 'asm'],
    },
  },
});
