import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const target = '/blog/best-free-hosting-platforms-2026';
const link = (t) => `[${t}](${target})`;

// Precise, contextual edits at existing natural mentions (not generic last-H2 dumps).
const edits = [
  {
    slug: 'build-portfolio-website-2026',
    find: '**For beginners:**\n- HTML, CSS, JavaScript (no framework)\n- Host on GitHub Pages or Netlify\n- Zero cost, simple deployment',
    replace: `**For beginners:**\n- HTML, CSS, JavaScript (no framework)\n- Host on GitHub Pages or Netlify\n- Zero cost, simple deployment\n- See our ${link('free hosting comparison')} for the exact limits of each option`,
  },
  {
    slug: 'nextjs-16-deployment-guide-2026-vercel-seo-custom-domain',
    find: 'If you see a deployment limit error on a Hobby plan, stop retrying repeatedly. Wait for the limit window to reset or deploy later from the dashboard. Repeated retries do not make the deployment faster and can waste the remaining quota.',
    replace: `If you see a deployment limit error on a Hobby plan, stop retrying repeatedly. Wait for the limit window to reset or deploy later from the dashboard. Repeated retries do not make the deployment faster and can waste the remaining quota. Our ${link('free hosting comparison')} covers Hobby's current limits alongside six other free options if you need an alternative.`,
  },
  {
    slug: 'git-github-beginners-guide-2026',
    find: 'Now that you know Git, use it to version control your [developer portfolio website](/blog/build-portfolio-website-2026). Hosting your portfolio on GitHub and deploying from there is a great way to demonstrate your Git skills to employers.',
    replace: `Now that you know Git, use it to version control your [developer portfolio website](/blog/build-portfolio-website-2026). Hosting your portfolio on GitHub and deploying from there is a great way to demonstrate your Git skills to employers — see our ${link('free hosting comparison')} for GitHub Pages' current limits and other free options.`,
  },
  {
    slug: 'docker-for-beginners-2026-guide',
    find: 'Docker containers run on every cloud platform:\n- **Railway**  - git push deploys with auto-detection\n- **Fly.io**  - `fly deploy` from Dockerfile',
    replace: `Docker containers run on every cloud platform (see our ${link('free hosting comparison')} for current free-tier limits):\n- **Railway**  - git push deploys with auto-detection\n- **Fly.io**  - \`fly deploy\` from Dockerfile`,
  },
];

for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': already linked'); continue; }
  const count = row.content.split(e.find).length - 1;
  assert.equal(count, 1, `${e.slug}: anchor text not uniquely found (count=${count})`);
  const updated = row.content.replace(e.find, e.replace);
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added at contextual anchor');
}

const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('inbound to hosting refresh:', back.map(b => b.slug).join(', '));
