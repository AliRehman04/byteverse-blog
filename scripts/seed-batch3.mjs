import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const img = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const CB = "```";
const BT = "`";

const posts = [
  // ─── POST 34: Git & GitHub for Beginners 2026 ───
  {
    title: "Git and GitHub for Beginners 2026: Complete Guide",
    slug: "git-github-beginners-guide-2026",
    excerpt: "Learn Git and GitHub from scratch — repositories, commits, branches, pull requests, and collaboration workflows explained step by step.",
    content: `**Git** is the version control system every developer uses. **GitHub** is where your code lives online. Together, they are the foundation of modern software development.

This guide teaches you Git and GitHub from absolute zero — no prior experience needed.

![Git and GitHub for beginners 2026 complete guide](${img("1618401471353-236d7d06738e")} "Git and GitHub beginners guide 2026")

## Why You Need Git and GitHub

- **Every tech company uses Git** — it is a non-negotiable skill
- **Track changes** — see every edit you have ever made to your code
- **Undo mistakes** — go back to any previous version instantly
- **Collaboration** — work on the same code with a team without conflicts
- **Portfolio** — your GitHub profile is your developer resume
- **Open source** — contribute to projects used by millions

## What Is Git?

Git is a **version control system** — it tracks every change you make to your files. Think of it as "save states" for your code.

**Without Git:**
- project-final.js
- project-final-v2.js
- project-REALLY-final.js
- project-final-final-USE-THIS.js

**With Git:**
- One project folder with complete history of every change
- Go back to any version with one command
- See who changed what and when

## What Is GitHub?

GitHub is a **cloud platform** that hosts your Git repositories online. It adds collaboration features like pull requests, issues, and project boards.

**Git = local tool on your computer**
**GitHub = online platform to share and collaborate**

Other alternatives: GitLab, Bitbucket — but GitHub is the most popular with 100+ million developers.

## Step 1: Installation

### Install Git

**Windows:**
Download from [git-scm.com](https://git-scm.com). Run the installer with default settings.

**Mac:**
${CB}bash
brew install git
${CB}
Or install Xcode Command Line Tools: ${BT}xcode-select --install${BT}

**Linux:**
${CB}bash
sudo apt install git    # Ubuntu/Debian
sudo dnf install git    # Fedora
${CB}

**Verify installation:**
${CB}bash
git --version
# git version 2.45.0
${CB}

### Configure Git

${CB}bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global init.defaultBranch main
${CB}

### Create a GitHub Account

Go to [github.com](https://github.com) and sign up for free. Choose a professional username — this becomes your developer identity.

## Step 2: Core Git Concepts

### Repository (Repo)

A repository is a folder tracked by Git. It contains your project files and the complete history of changes.

### Commit

A commit is a snapshot of your project at a specific point in time. Each commit has a message describing what changed.

Think of commits as save points in a video game — you can always go back to any save point.

### Branch

A branch is a separate line of development. The ${BT}main${BT} branch is your primary codebase. Create new branches to work on features without affecting main.

### Remote

A remote is the online copy of your repository (on GitHub). You ${BT}push${BT} changes to the remote and ${BT}pull${BT} changes from it.

## Step 3: Your First Repository

### Create a Local Repository

${CB}bash
# Create a new project folder
mkdir my-first-repo
cd my-first-repo

# Initialize Git tracking
git init

# Create a file
echo "# My First Project" > README.md

# Check status (shows untracked files)
git status

# Stage the file (prepare for commit)
git add README.md

# Commit (save the snapshot)
git commit -m "Initial commit: add README"
${CB}

### Push to GitHub

1. Go to GitHub → New Repository
2. Name it "my-first-repo"
3. Do NOT initialize with README (you already have one)
4. Copy the commands GitHub gives you:

${CB}bash
git remote add origin https://github.com/yourusername/my-first-repo.git
git push -u origin main
${CB}

Your code is now on GitHub!

## Step 4: The Git Workflow

The daily workflow every developer follows:

${CB}
1. git pull          → Get latest changes from team
2. Make your changes → Edit code, add files
3. git add .         → Stage all changed files
4. git commit -m ""  → Save snapshot with message
5. git push          → Upload to GitHub
${CB}

### Essential Commands

| Command | What It Does |
|---------|-------------|
| ${BT}git init${BT} | Initialize a new repository |
| ${BT}git clone <url>${BT} | Download a repository from GitHub |
| ${BT}git status${BT} | Show changed/staged/untracked files |
| ${BT}git add .${BT} | Stage all changes for commit |
| ${BT}git add <file>${BT} | Stage a specific file |
| ${BT}git commit -m "msg"${BT} | Save staged changes with message |
| ${BT}git push${BT} | Upload commits to GitHub |
| ${BT}git pull${BT} | Download and merge remote changes |
| ${BT}git log${BT} | View commit history |
| ${BT}git diff${BT} | Show unstaged changes |
| ${BT}git branch${BT} | List all branches |
| ${BT}git checkout -b <name>${BT} | Create and switch to new branch |
| ${BT}git merge <branch>${BT} | Merge a branch into current branch |

## Step 5: Branching

Branches let you work on features without breaking the main code.

### Create and Use a Branch

${CB}bash
# Create a new branch and switch to it
git checkout -b feature/add-login

# Make your changes...
# Then commit
git add .
git commit -m "Add login page"

# Push the branch to GitHub
git push -u origin feature/add-login

# When done, switch back to main
git checkout main

# Merge the feature branch
git merge feature/add-login

# Push the updated main
git push
${CB}

### Branch Naming Conventions

- ${BT}feature/add-login${BT} — new features
- ${BT}fix/navbar-bug${BT} — bug fixes
- ${BT}refactor/cleanup-utils${BT} — code cleanup
- ${BT}docs/update-readme${BT} — documentation

## Step 6: Pull Requests (PRs)

Pull requests are GitHub's way of reviewing code before merging.

### How Pull Requests Work

1. Create a feature branch and push your changes
2. On GitHub, click "New Pull Request"
3. Select your branch → main
4. Add a title and description
5. Request reviewers
6. Reviewers comment, suggest changes, or approve
7. Merge the PR when approved
8. Delete the feature branch

### Writing Good PR Descriptions

${CB}markdown
## What this PR does
Added user login page with email/password authentication.

## Changes
- Created LoginForm component
- Added /api/auth/login route
- Added input validation
- Added error handling for invalid credentials

## How to test
1. Go to /login
2. Enter test@example.com / password123
3. Should redirect to dashboard
${CB}

![Git branching and pull request workflow](${img("1522202176988-66273c2fd55f")} "Git pull request workflow 2026")

## Step 7: Handling Merge Conflicts

Conflicts happen when two people edit the same line of code. Git cannot decide which version to keep, so you resolve it manually.

**What a conflict looks like:**
${CB}
<<<<<<< HEAD
const greeting = "Hello World";
=======
const greeting = "Hi there";
>>>>>>> feature/new-greeting
${CB}

**How to resolve:**
1. Open the conflicting file
2. Choose which version to keep (or combine both)
3. Remove the conflict markers (<<<, ===, >>>)
4. Stage and commit the resolution

${CB}bash
# After fixing the conflict
git add .
git commit -m "Resolve merge conflict in greeting"
${CB}

**VS Code tip:** VS Code shows conflict resolution buttons — "Accept Current", "Accept Incoming", "Accept Both" — click to resolve without manual editing.

## Step 8: .gitignore

The ${BT}.gitignore${BT} file tells Git which files to NOT track. Never commit sensitive data or generated files.

**Essential .gitignore for web projects:**
${CB}
# Dependencies
node_modules/

# Environment variables (NEVER commit these)
.env
.env.local
.env.production

# Build output
.next/
dist/
build/

# OS files
.DS_Store
Thumbs.db

# IDE settings
.vscode/
.idea/
${CB}

**Create .gitignore BEFORE your first commit** to avoid accidentally committing node_modules or secrets.

## Step 9: GitHub Profile Tips

Your GitHub profile is your developer resume. Make it stand out:

1. **Pin your best 6 repositories** — show your best work
2. **Write good READMEs** — every project needs description, setup instructions, and screenshots
3. **Contribute consistently** — the green contribution graph shows activity
4. **Add a profile README** — create a repo named your username with a README.md
5. **Use topics/tags** — add language and framework tags to repos
6. **Star and fork interesting projects** — shows your interests
7. **Contribute to open source** — proves collaboration skills

## Common Git Mistakes and Fixes

### Accidentally committed wrong files
${CB}bash
git reset HEAD~1          # Undo last commit (keep changes)
# Fix the files, then commit again
${CB}

### Committed to wrong branch
${CB}bash
git stash                 # Save changes temporarily
git checkout correct-branch
git stash pop             # Apply saved changes here
${CB}

### Need to update commit message
${CB}bash
git commit --amend -m "New correct message"
${CB}

### Accidentally deleted a file
${CB}bash
git checkout -- filename  # Restore file from last commit
${CB}

### Want to undo all local changes
${CB}bash
git checkout -- .         # Discard all unstaged changes
${CB}

## Git Workflow for Teams

### Feature Branch Workflow (Most Common)

${CB}
main (production-ready code)
  └── feature/user-auth (your feature)
  └── feature/payment (teammate's feature)
  └── fix/login-bug (bug fix)
${CB}

**Rules:**
1. Never commit directly to main
2. Create a branch for every feature/fix
3. Open a PR for review
4. Merge only after approval
5. Delete branch after merging

## Related ByteVerse guides

Next, read [JavaScript Roadmap 2026](/blog/javascript-roadmap-2026-beginner-job-ready), [How to Learn Programming 2026](/blog/how-to-learn-programming-2026-complete-guide), [Best VS Code Extensions 2026](/blog/best-vscode-extensions-2026-web-developers), and [Best AI Coding Assistants 2026](/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf) to explore more.

## Frequently Asked Questions

### Is Git hard to learn?

The basics (init, add, commit, push, pull) take 1-2 hours to learn. Branching and pull requests take a few days of practice. Advanced features (rebasing, cherry-picking) take weeks but are rarely needed as a beginner.

### Do I need Git for personal projects?

Yes. Even solo projects benefit from version control. You can undo mistakes, track your progress, and your GitHub profile serves as your portfolio. Start using Git for every project from day one.

### What is the difference between Git and GitHub?

Git is a version control tool installed on your computer. GitHub is a cloud platform that hosts Git repositories online and adds collaboration features like pull requests and issues. You can use Git without GitHub but not GitHub without Git.

### How often should I commit?

Commit after every meaningful change — completing a feature, fixing a bug, or reaching a working state. Small, frequent commits with clear messages are better than large, infrequent ones.

### Can I use Git with VS Code?

Yes. VS Code has excellent built-in Git support — staging, committing, branching, and resolving conflicts all work through the UI. The GitLens extension adds even more features like inline blame and file history.

### Is GitHub free?

Yes. Free accounts get unlimited public and private repositories, unlimited collaborators, and 2,000 GitHub Actions minutes per month. Paid plans add features like protected branches and advanced security.`,
    coverImage: img("1618401471353-236d7d06738e"),
    categoryId: 4, // coding
    keywords: "git github beginners guide 2026, learn git from scratch, github tutorial for beginners, git commands cheat sheet, how to use git, git branching tutorial, pull request guide, github portfolio tips, version control for beginners, git workflow for teams",
    metaTitle: "Git and GitHub for Beginners 2026: Complete Guide",
    metaDescription: "Learn Git and GitHub from scratch — repositories, commits, branches, pull requests, and collaboration workflows explained step by step.",
    readingTime: "12 min read",
    author: "ByteVerse",
  },

  // ─── POST 35: Best AI Video Generators 2026 ───
  {
    title: "Best AI Video Generators 2026: Create Videos from Text",
    slug: "best-ai-video-generators-2026",
    excerpt: "Compare the best AI video generators in 2026 — Sora, Runway, Kling, Pika, and more for creating professional videos from text prompts.",
    content: `**AI video generation** went from a gimmick to production-ready in 2026. You can now create cinematic videos, product demos, social media content, and animations from a text description.

Here are the best AI video generators ranked by quality, features, and value.

![Best AI video generators 2026](${img("1536240478700-b869070f9279")} "Best AI video generators 2026")

## Quick Comparison

| Tool | Video Quality | Max Length | Price | Best For |
|------|-------------|-----------|-------|----------|
| Sora (OpenAI) | 10/10 | 60 sec | $20/mo (ChatGPT Plus) | Cinematic quality |
| Runway Gen-3 | 9/10 | 40 sec | $12/mo | Professional editing |
| Kling AI | 9/10 | 120 sec | Free / $8/mo | Longest videos |
| Pika | 8/10 | 10 sec | Free / $8/mo | Quick social clips |
| Luma Dream Machine | 8/10 | 5 sec | Free / $24/mo | 3D motion |
| Synthesia | 8/10 | Unlimited | $22/mo | AI avatar videos |
| HeyGen | 8/10 | Unlimited | $24/mo | Business presentations |
| Veo 2 (Google) | 9/10 | 30 sec | Free (limited) | Google users |
| Minimax (Hailuo) | 8/10 | 6 sec | Free | Free option |
| InVideo AI | 7/10 | Unlimited | Free / $25/mo | Full video editing |

## Top Tier: Best Quality

### 1. Sora — Best Overall Quality

OpenAI's Sora produces the most realistic AI videos in 2026. The physics, lighting, and motion are nearly indistinguishable from real footage.

**Strengths:**
- Most realistic video generation available
- Excellent understanding of physics and motion
- Cinematic lighting and camera movements
- Up to 60 seconds of video
- Integrated into ChatGPT — describe what you want in conversation
- Image-to-video and video-to-video capabilities
- Multiple aspect ratios (landscape, portrait, square)

**Weaknesses:**
- Only available through ChatGPT Plus ($20/month)
- Limited generations per month
- Slow generation (minutes per video)
- Cannot generate text or complex hands reliably
- Content restrictions on certain types of videos

**Best for:** Marketing videos, concept visualizations, cinematic B-roll, social media content.

**Prompting tips:**
- Be specific about camera movement: "slow dolly shot", "aerial view", "tracking shot"
- Describe lighting: "golden hour", "neon-lit", "soft studio lighting"
- Specify style: "35mm film", "documentary style", "cinematic"
- Include motion: "a woman walking through a rain-soaked Tokyo street at night"

**Price:** Included with ChatGPT Plus ($20/month) — limited generations

### 2. Runway Gen-3 Alpha — Best for Professional Use

Runway is the most established AI video platform. Gen-3 Alpha produces near-Sora quality with better editing tools.

**Strengths:**
- High quality, consistent output
- Best editing tools (extend, remove, re-style)
- Motion Brush — control which parts of the image move
- Image-to-video with precise control
- Director mode — control camera angle and motion
- Lip sync — make characters speak your script
- Green screen removal and background replacement
- Professional workflow integration

**Weaknesses:**
- Expensive at scale (credits run out quickly)
- 40-second maximum per generation
- Requires learning the interface
- Free tier very limited (125 credits)

**Best for:** Professional content creators, filmmakers, marketing teams, product demos.

**Price:** Free (125 credits) | Standard: $12/month (625 credits) | Pro: $28/month (2250 credits)

### 3. Kling AI — Best for Long Videos

Kling by Kuaishou produces excellent quality videos up to 2 minutes — the longest of any AI video generator.

**Strengths:**
- Up to 120 seconds per video (industry leading)
- High quality motion and physics
- Free tier with generous limits
- Fast generation speed
- Good at human faces and expressions
- Motion transfer from reference videos

**Weaknesses:**
- Less precise camera control than Runway
- UI is less polished
- Some content restrictions
- Quality varies more than Sora/Runway

**Best for:** Social media content, YouTube shorts, longer narrative clips.

**Price:** Free (daily credits) | Pro: $8/month | Premium: $28/month

![AI video generation comparison 2026](${img("1550439062-609e1833e81a")} "AI video generators comparison 2026")

## Mid Tier: Best Value

### 4. Pika — Best for Quick Social Clips

Pika is fast, easy, and perfect for creating short social media clips.

**Strengths:**
- Very fast generation (seconds, not minutes)
- Simple interface — great for beginners
- Lip sync and sound effects built in
- Modify specific parts of a video
- Good free tier
- Fun creative effects

**Price:** Free (250 credits/month) | Standard: $8/month | Pro: $28/month

### 5. Luma Dream Machine — Best for 3D Motion

Luma excels at 3D-style motion and object rotation.

**Strengths:**
- Excellent 3D understanding and object rotation
- Smooth camera movements
- Good at product visualization
- Free tier available

**Price:** Free (30 generations/month) | Standard: $24/month

### 6. Veo 2 (Google) — Best Free Option

Google's Veo 2, available through Google Labs, produces high-quality videos for free (with limits).

**Strengths:**
- High quality output rivaling Sora
- Free access through Google Labs
- Good understanding of physics
- Up to 30 seconds
- Multiple styles and camera options

**Price:** Free (limited access through Google Labs)

## AI Avatar Videos

### 7. Synthesia — Best for Training and Presentations

Synthesia creates videos with AI avatars that speak your script. Perfect for corporate training, tutorials, and presentations.

**Strengths:**
- 230+ realistic AI avatars
- 140+ languages with natural voice
- Custom avatar creation (use your own face)
- No camera, microphone, or editing needed
- Templates for corporate, training, and marketing
- Screen recording integration
- Brand kit and custom backgrounds

**Use cases:**
- Employee training videos
- Product tutorials and demos
- Sales presentations
- Internal communications
- Customer onboarding

**Price:** Starter: $22/month | Creator: $67/month | Enterprise: custom

### 8. HeyGen — Best for Business Videos

Similar to Synthesia but with better real-time avatar interaction.

**Strengths:**
- Real-time AI avatar conversations
- Excellent lip sync quality
- Video translation (translate yourself speaking)
- Interactive avatar for customer support
- Instant avatar creation from a photo

**Price:** Free (1 credit) | Creator: $24/month | Business: $72/month

## Full Video Editors with AI

### 9. InVideo AI — Best AI Video Editor

InVideo AI creates complete videos from text prompts — including script, stock footage, voiceover, music, and transitions.

**How it works:**
1. Describe your video: "Create a 3-minute YouTube video about the benefits of meditation"
2. InVideo AI writes the script, selects stock footage, adds voiceover and music
3. Edit in the timeline editor
4. Export in any resolution

**Price:** Free (watermark) | Business: $25/month | Unlimited: $50/month

### 10. CapCut (with AI features)

CapCut is primarily a video editor, but its AI features are excellent:
- Auto-captions (best quality available)
- Background removal
- AI enhance (upscale video quality)
- AI-generated B-roll
- Text-to-speech voiceover

**Price:** Free (most features) | Pro: $8/month

## How to Choose

| Use Case | Best Tool | Why |
|----------|-----------|-----|
| Cinematic quality | Sora | Best visual quality |
| Professional editing | Runway | Best editing tools |
| Social media clips | Pika | Fast, easy, fun |
| Talking head videos | Synthesia | Best AI avatars |
| YouTube videos | InVideo AI | Full video creation |
| Long clips (1-2 min) | Kling | Longest generation |
| Free option | Veo 2 / Kling | Generous free tiers |
| Product demos | Runway | Control + quality |
| Business presentations | HeyGen | Professional avatars |
| Video editing | CapCut | Best AI-enhanced editor |

## Prompting Tips for AI Video

### Structure of a Good Video Prompt

${CB}
[Camera movement] + [Subject] + [Action] + [Environment] + [Lighting] + [Style]
${CB}

**Example prompts:**

**Basic:** "A cat playing with a ball"
**Better:** "Close-up tracking shot of an orange tabby cat playfully batting a red yarn ball across a sunlit hardwood floor, warm afternoon light streaming through windows, cinematic shallow depth of field, 4K"

**Cinematic:** "Slow-motion aerial drone shot pulling back over a misty mountain lake at sunrise, pine forests on both sides, golden hour light reflecting on the still water, 35mm film grain, Terrence Malick style"

**Product:** "Smooth 360-degree rotation of a modern white sneaker on a minimalist black pedestal, soft studio lighting with subtle rim light, product photography style, 4K"

### Tips for Better Results

1. **Specify camera movement** — tracking, dolly, pan, aerial, steadicam
2. **Describe lighting** — golden hour, neon, studio, natural, dramatic
3. **Set the style** — cinematic, documentary, commercial, anime
4. **Include motion details** — what moves, how fast, in what direction
5. **Reference film styles** — "Wes Anderson style", "Christopher Nolan cinematography"
6. **Keep it simple** — one subject, one action, one scene per generation
7. **Use image-to-video** — start from a perfect image for more control

## AI Video Ethics and Legal

**Do:**
- Use for personal and commercial projects (check each tool's terms)
- Disclose AI-generated content when required
- Use for creative ideation and mockups
- Create educational and marketing content

**Do not:**
- Create deepfakes of real people without consent
- Generate misleading news or journalism
- Impersonate real people or brands
- Create harmful or explicit content
- Claim AI video as real footage without disclosure

## Cost Comparison for Regular Creators

**Budget setup ($0-8/month):**
Kling free + Pika free + CapCut free = $0

**Standard setup ($20-30/month):**
ChatGPT Plus with Sora ($20) + CapCut free = $20/month

**Professional setup ($40-70/month):**
Runway Pro ($28) + Synthesia Starter ($22) + CapCut Pro ($8) = $58/month

## Related ByteVerse guides

Next, read [Best AI Image Generators 2026](/blog/best-ai-image-generators-2026-free-paid), [10 Best Free AI Tools 2026](/blog/10-best-free-ai-tools-in-2026-that-will-blow-your-mind), [How to Make Money with AI 2026](/blog/how-to-make-money-with-ai-2026), and [Canva AI vs Adobe Express 2026](/blog/canva-ai-vs-adobe-express-2026) to explore more.

## Frequently Asked Questions

### What is the best free AI video generator?

Kling AI and Pika both have generous free tiers. Kling offers the longest free videos (up to 120 seconds). Google Veo 2 is also free through Google Labs with high quality output. For full video editing, CapCut's free tier is excellent.

### Can AI-generated videos be used commercially?

Most tools allow commercial use on their paid plans. Check each tool's terms of service. Sora (through ChatGPT Plus), Runway (paid plans), and Synthesia all permit commercial use. Free tier content may have restrictions.

### Will AI video generators replace videographers?

For stock footage, B-roll, product shots, and training videos — yes, AI is replacing traditional production. For narrative filmmaking, live events, interviews, and complex productions — human videographers remain essential. AI is a powerful tool, not a replacement for creative vision.

### How long can AI-generated videos be?

Kling leads with 120 seconds per generation. Sora does 60 seconds. Runway does 40 seconds. For longer videos, use InVideo AI or Synthesia which can create unlimited-length videos by combining clips and using AI avatars.

### Is Sora the best AI video generator?

For visual quality and realism, yes. But Runway offers better editing tools, Kling offers longer videos, and Synthesia is better for talking-head presentations. The "best" depends on your specific use case and budget.`,
    coverImage: img("1536240478700-b869070f9279"),
    categoryId: 1, // ai-tools
    keywords: "best AI video generators 2026, Sora OpenAI review, Runway Gen-3 review, AI video from text, AI video creation tools, Kling AI review, free AI video generator, Pika AI review, AI video editing tools, text to video AI 2026",
    metaTitle: "Best AI Video Generators 2026: Create Videos from Text",
    metaDescription: "Compare the best AI video generators in 2026 — Sora, Runway, Kling, Pika, and more for creating professional videos from text prompts.",
    readingTime: "11 min read",
    author: "ByteVerse",
  },

  // ─── POST 36: Docker for Beginners 2026 ───
  {
    title: "Docker for Beginners 2026: Complete Getting Started Guide",
    slug: "docker-for-beginners-2026-guide",
    excerpt: "Learn Docker from scratch — containers, images, Docker Compose, and deployment explained step by step for beginners.",
    content: `**Docker** solves the "it works on my machine" problem. It packages your application with all its dependencies into a **container** that runs the same everywhere — your laptop, your teammate's laptop, and the production server.

This guide teaches you Docker from zero, step by step.

![Docker for beginners 2026 getting started guide](${img("1605745341112-85968b19335b")} "Docker for beginners 2026")

## Why Learn Docker in 2026?

- **Industry standard** — 83% of organizations use containers in production
- **Required in job postings** — most backend and DevOps roles require Docker knowledge
- **Consistent environments** — no more "works on my machine" issues
- **Easy deployment** — deploy to any cloud with one command
- **Microservices** — Docker is the foundation of modern architecture
- **Learning DevOps** — Docker is the first step toward Kubernetes

## What Is Docker?

Docker creates **containers** — lightweight, isolated environments that package your app with everything it needs to run.

**Without Docker:**
- "Install Node.js 20, PostgreSQL 15, Redis 7, set these 20 environment variables, run these 5 commands..."
- Works on your machine but crashes on your teammate's
- Production server has different versions of everything

**With Docker:**
- One Dockerfile describes everything your app needs
- ${BT}docker compose up${BT} starts everything with one command
- Same environment everywhere — development, testing, production

## Key Concepts

### Images vs Containers

| Concept | Analogy | What It Is |
|---------|---------|-----------|
| **Image** | Recipe | Blueprint with instructions to build your environment |
| **Container** | The meal | A running instance of an image |

- An **image** is a read-only template (like a class in programming)
- A **container** is a running instance of an image (like an object)
- You can run multiple containers from the same image

### Dockerfile

A Dockerfile is a text file with instructions to build an image:

${CB}dockerfile
# Start from Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start command
CMD ["npm", "start"]
${CB}

**What each instruction does:**
- ${BT}FROM${BT} — base image to start from (like an OS with tools pre-installed)
- ${BT}WORKDIR${BT} — set the working directory inside the container
- ${BT}COPY${BT} — copy files from your machine into the container
- ${BT}RUN${BT} — execute a command during image build
- ${BT}EXPOSE${BT} — document which port the app listens on
- ${BT}CMD${BT} — the command to run when the container starts

## Step 1: Install Docker

**Windows/Mac:**
Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)

**Linux:**
${CB}bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
${CB}

**Verify installation:**
${CB}bash
docker --version
# Docker version 27.x.x

docker run hello-world
# Should print "Hello from Docker!"
${CB}

## Step 2: Your First Container

### Run an Existing Image

${CB}bash
# Run an Nginx web server
docker run -d -p 8080:80 nginx

# -d = run in background (detached)
# -p 8080:80 = map your port 8080 to container's port 80
${CB}

Open http://localhost:8080 — you will see the Nginx welcome page!

### Manage Containers

${CB}bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop <container_id>

# Remove a container
docker rm <container_id>

# View container logs
docker logs <container_id>

# Execute a command inside a container
docker exec -it <container_id> /bin/sh
${CB}

## Step 3: Build Your Own Image

### Example: Dockerize a Node.js App

1. Create a simple app:

${CB}javascript
// server.js
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Docker!');
});
server.listen(3000, () => console.log('Server running on port 3000'));
${CB}

2. Create a Dockerfile:

${CB}dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
${CB}

3. Build and run:

${CB}bash
# Build the image
docker build -t my-app .

# Run a container from the image
docker run -d -p 3000:3000 my-app

# Test it
curl http://localhost:3000
# Hello from Docker!
${CB}

### .dockerignore

Like .gitignore, this file tells Docker what NOT to copy:

${CB}
node_modules
.git
.env
.next
dist
*.log
${CB}

**Always include node_modules** — dependencies should be installed fresh inside the container.

![Docker container workflow diagram](${img("1542831371-29b0f74f9713")} "Docker container workflow 2026")

## Step 4: Docker Compose

Docker Compose lets you run **multiple containers** together. Most real apps need a web server + database + cache.

### docker-compose.yml Example

${CB}yaml
version: '3.8'

services:
  # Your web application
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache

  # PostgreSQL database
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis cache
  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
${CB}

### Docker Compose Commands

${CB}bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Stop all services
docker compose down

# Rebuild after code changes
docker compose up --build

# View logs
docker compose logs -f

# Run a command in a service
docker compose exec web sh
${CB}

**One command to start your entire app** — web server, database, and cache. Every team member runs the same setup.

## Step 5: Volumes (Persistent Data)

Containers are ephemeral — when you remove a container, its data is gone. Volumes persist data outside the container.

**Types of volumes:**
- **Named volumes** — Docker manages the storage (best for databases)
- **Bind mounts** — map a host directory to a container directory (best for development)

${CB}yaml
# Named volume (database data persists)
volumes:
  - pgdata:/var/lib/postgresql/data

# Bind mount (live code reloading for development)
volumes:
  - ./src:/app/src
${CB}

## Step 6: Docker for Development

### Hot Reloading Setup

For development, mount your source code so changes appear instantly:

${CB}yaml
# docker-compose.dev.yml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app           # Mount entire project
      - /app/node_modules # Prevent overwriting node_modules
    environment:
      - NODE_ENV=development
${CB}

${CB}dockerfile
# Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
${CB}

## Step 7: Deploying with Docker

### Deploy to Any Cloud

Docker containers run on every cloud platform:
- **Railway** — git push deploys with auto-detection
- **Fly.io** — ${BT}fly deploy${BT} from Dockerfile
- **AWS ECS** — managed container service
- **Google Cloud Run** — serverless containers
- **DigitalOcean App Platform** — simple container hosting

### Production Dockerfile (Multi-Stage Build)

${CB}dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production (smaller image)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
${CB}

**Multi-stage builds** create smaller production images by only including what is needed to run (not build tools, dev dependencies, etc.).

## Essential Docker Commands Cheat Sheet

| Command | What It Does |
|---------|-------------|
| ${BT}docker build -t name .${BT} | Build image from Dockerfile |
| ${BT}docker run -d -p 3000:3000 name${BT} | Run container |
| ${BT}docker ps${BT} | List running containers |
| ${BT}docker stop id${BT} | Stop container |
| ${BT}docker rm id${BT} | Remove container |
| ${BT}docker images${BT} | List images |
| ${BT}docker rmi name${BT} | Remove image |
| ${BT}docker logs id${BT} | View logs |
| ${BT}docker exec -it id sh${BT} | Shell into container |
| ${BT}docker compose up -d${BT} | Start all services |
| ${BT}docker compose down${BT} | Stop all services |
| ${BT}docker compose logs -f${BT} | Follow logs |
| ${BT}docker system prune${BT} | Clean unused resources |

## Common Mistakes Beginners Make

1. **Not using .dockerignore** — copies node_modules into the image (huge, slow)
2. **Running as root** — add ${BT}USER node${BT} in Dockerfile for security
3. **Not using multi-stage builds** — production images are unnecessarily large
4. **Storing secrets in Dockerfile** — use environment variables or secrets management
5. **Not using volumes for databases** — data disappears when container is removed
6. **Using ${BT}latest${BT} tag** — always pin specific versions (${BT}node:20-alpine${BT}, not ${BT}node:latest${BT})
7. **Ignoring layer caching** — put COPY package.json before COPY . for faster builds
8. **Not cleaning up** — run ${BT}docker system prune${BT} regularly to free disk space

## Related ByteVerse guides

Next, read [Next.js 16 Deployment Guide 2026](/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain), [JavaScript Roadmap 2026](/blog/javascript-roadmap-2026-beginner-job-ready), [How to Learn Programming 2026](/blog/how-to-learn-programming-2026-complete-guide), and [Website Speed Optimization 2026](/blog/website-speed-optimization-checklist-2026-core-web-vitals) to explore more.

## Frequently Asked Questions

### Is Docker hard to learn?

The basics (build, run, docker-compose) take 2-3 hours to learn. Understanding images, containers, volumes, and networking takes a few days of practice. Docker is easier than most people expect — the concepts are intuitive once you start using them.

### Do I need Docker for web development?

Not strictly necessary, but highly recommended. Docker ensures every team member has the same development environment. It eliminates "works on my machine" problems and makes onboarding new developers instant.

### Docker vs virtual machines — what is the difference?

Docker containers share the host OS kernel, making them lightweight (MBs) and fast to start (seconds). Virtual machines include a full OS, making them heavy (GBs) and slow to start (minutes). Use Docker for applications, VMs for running different operating systems.

### How much RAM does Docker need?

Docker Desktop recommends 4GB RAM minimum. Each container uses only what the app inside it needs — a Node.js app might use 50-200MB. A typical development setup with web server + database + cache uses 500MB-1GB total.

### Should I learn Docker or Kubernetes first?

Docker first, always. Kubernetes orchestrates Docker containers at scale. You need to understand Docker containers before Kubernetes makes sense. Learn Docker → Docker Compose → then Kubernetes when you need to manage many containers.

### Is Docker free?

Docker Engine is free and open source. Docker Desktop is free for personal use, education, and small businesses (under 250 employees). Large enterprises need a Docker Business subscription ($24/user/month).`,
    coverImage: img("1605745341112-85968b19335b"),
    categoryId: 2, // tech-guides
    keywords: "docker beginners guide 2026, learn docker from scratch, docker tutorial for developers, docker compose tutorial, dockerfile explained, containerization for beginners, docker vs virtual machines, docker development workflow, deploy with docker, docker commands cheat sheet",
    metaTitle: "Docker for Beginners 2026: Complete Getting Started Guide",
    metaDescription: "Learn Docker from scratch — containers, images, Docker Compose, and deployment explained step by step for beginners in 2026.",
    readingTime: "13 min read",
    author: "ByteVerse",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

  for (const post of posts) {
    // Safety check: meta_description ≤ 160 chars
    if (post.metaDescription.length > 160) {
      console.error(`❌ metaDescription too long for "${post.title}": ${post.metaDescription.length} chars`);
      process.exit(1);
    }

    const result = await sql.query(
      `INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, author, published, keywords, meta_title, meta_description, reading_time, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id`,
      [post.title, post.slug, post.excerpt, post.content, post.coverImage, post.categoryId, post.author, post.keywords, post.metaTitle, post.metaDescription, post.readingTime]
    );
    const words = post.content.split(/\s+/).length;
    console.log(`✅ [ID ${result[0].id}] ${post.title} — ${words} words`);
  }
  console.log(`\nDone! Created ${posts.length} new posts.`);
}

main().catch(e => { console.error(e); process.exit(1); });
