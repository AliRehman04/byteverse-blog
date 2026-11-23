**Git** is the version control system every developer uses. **GitHub** is where your code lives online. Together, they are the foundation of modern software development.

This guide teaches you Git and GitHub from absolute zero  - no prior experience needed.

## Why You Need Git and GitHub

- **Every tech company uses Git**  - it is a non-negotiable skill
- **Track changes**  - see every edit you have ever made to your code
- **Undo mistakes**  - go back to any previous version instantly
- **Collaboration**  - work on the same code with a team without conflicts
- **Portfolio**  - your GitHub profile is your developer resume
- **Open source**  - contribute to projects used by millions

## What Is Git?

Git is a **version control system**  - it tracks every change you make to your files. Think of it as "save states" for your code.

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

Other alternatives: GitLab, Bitbucket  - but GitHub is the most popular with 100+ million developers.

## Step 1: Installation

### Install Git

![Programmer debugging code in an office](https://images.pexels.com/photos/4050347/pexels-photo-4050347.jpeg?auto=compress&cs=tinysrgb&w=1600 "The fastest learning happens when examples turn into real projects.")

**Windows:**
Download from [git-scm.com](https://git-scm.com). Run the installer with default settings.

**Mac:**
```bash
brew install git
```
Or install Xcode Command Line Tools: `xcode-select --install`

**Linux:**
```bash
sudo apt install git    # Ubuntu/Debian
sudo dnf install git    # Fedora
```

**Verify installation:**
```bash
git --version
# Git and GitHub for Beginners 2026: Complete Guide
```

### Configure Git

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global init.defaultBranch main
```

### Create a GitHub Account

Go to [github.com](https://github.com) and sign up for free. Choose a professional username  - this becomes your developer identity.

## Step 2: Core Git Concepts

### Repository (Repo)

A repository is a folder tracked by Git. It contains your project files and the complete history of changes.

### Commit

A commit is a snapshot of your project at a specific point in time. Each commit has a message describing what changed.

Think of commits as save points in a video game  - you can always go back to any save point.

### Branch

A branch is a separate line of development. The `main` branch is your primary codebase. Create new branches to work on features without affecting main.

### Remote

A remote is the online copy of your repository (on GitHub). You `push` changes to the remote and `pull` changes from it.

## Step 3: Your First Repository

### Create a Local Repository

```bash
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
```

### Push to GitHub

1. Go to GitHub → New Repository
2. Name it "my-first-repo"
3. Do NOT initialize with README (you already have one)
4. Copy the commands GitHub gives you:

```bash
git remote add origin https://github.com/yourusername/my-first-repo.git
git push -u origin main
```

Your code is now on GitHub!

## Step 4: The Git Workflow

The daily workflow every developer follows:

```
1. git pull          → Get latest changes from team
2. Make your changes → Edit code, add files
3. git add .         → Stage all changed files
4. git commit -m ""  → Save snapshot with message
5. git push          → Upload to GitHub
```

### Essential Commands

| Command | What It Does |
|---------|-------------|
| `git init` | Initialize a new repository |
| `git clone <url>` | Download a repository from GitHub |
| `git status` | Show changed/staged/untracked files |
| `git add .` | Stage all changes for commit |
| `git add <file>` | Stage a specific file |
| `git commit -m "msg"` | Save staged changes with message |
| `git push` | Upload commits to GitHub |
| `git pull` | Download and merge remote changes |
| `git log` | View commit history |
| `git diff` | Show unstaged changes |
| `git branch` | List all branches |
| `git checkout -b <name>` | Create and switch to new branch |
| `git merge <branch>` | Merge a branch into current branch |

## Step 5: Branching

Branches let you work on features without breaking the main code.

![Developer learning with a real project](https://images.pexels.com/photos/3862130/pexels-photo-3862130.jpeg?auto=compress&cs=tinysrgb&w=1600 "Modern coding assistants are best used as pair programmers, not autopilot.")

### Create and Use a Branch

```bash
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
```

### Branch Naming Conventions

- `feature/add-login`  - new features
- `fix/navbar-bug`  - bug fixes
- `refactor/cleanup-utils`  - code cleanup
- `docs/update-readme`  - documentation

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

```markdown
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
```

![Programmer debugging code in an office](https://images.pexels.com/photos/3862132/pexels-photo-3862132.jpeg?auto=compress&cs=tinysrgb&w=1600 "The fastest learning happens when examples turn into real projects.")

## Step 7: Handling Merge Conflicts

Conflicts happen when two people edit the same line of code. Git cannot decide which version to keep, so you resolve it manually.

**What a conflict looks like:**
```
<<<<<<< HEAD
const greeting = "Hello World";
=======
const greeting = "Hi there";
>>>>>>> feature/new-greeting
```

**How to resolve:**
1. Open the conflicting file
2. Choose which version to keep (or combine both)
3. Remove the conflict markers (<<<, ===, >>>)
4. Stage and commit the resolution

```bash
# After fixing the conflict
git add .
git commit -m "Resolve merge conflict in greeting"
```

**VS Code tip:** VS Code shows conflict resolution buttons  - "Accept Current", "Accept Incoming", "Accept Both"  - click to resolve without manual editing.

## Step 8: .gitignore

The `.gitignore` file tells Git which files to NOT track. Never commit sensitive data or generated files.

**Essential .gitignore for web projects:**
```
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
```

**Create .gitignore BEFORE your first commit** to avoid accidentally committing node_modules or secrets.

## Step 9: GitHub Profile Tips

Your GitHub profile is your developer resume. Make it stand out:

1. **Pin your best 6 repositories**  - show your best work
2. **Write good READMEs**  - every project needs description, setup instructions, and screenshots
3. **Contribute consistently**  - the green contribution graph shows activity
4. **Add a profile README**  - create a repo named your username with a README.md
5. **Use topics/tags**  - add language and framework tags to repos
6. **Star and fork interesting projects**  - shows your interests
7. **Contribute to open source**  - proves collaboration skills

## Common Git Mistakes and Fixes

### Accidentally committed wrong files
```bash
git reset HEAD~1          # Undo last commit (keep changes)
# Fix the files, then commit again
```

![Developer writing code on a laptop](https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=1600 "Good developer tools reduce friction without hiding how the code works.")

### Committed to wrong branch
```bash
git stash                 # Save changes temporarily
git checkout correct-branch
git stash pop             # Apply saved changes here
```

### Need to update commit message
```bash
git commit --amend -m "New correct message"
```

### Accidentally deleted a file
```bash
git checkout -- filename  # Restore file from last commit
```

### Want to undo all local changes
```bash
git checkout -- .         # Discard all unstaged changes
```

## Git Workflow for Teams

### Feature Branch Workflow (Most Common)

```
main (production-ready code)
  └── feature/user-auth (your feature)
  └── feature/payment (teammate's feature)
  └── fix/login-bug (bug fix)
```

**Rules:**
1. Never commit directly to main
2. Create a branch for every feature/fix
3. Open a PR for review
4. Merge only after approval
5. Delete branch after merging

## Related ByteVerse guides

Next, read [JavaScript Roadmap 2026](/blog/javascript-roadmap-2026-beginner-job-ready), [How to Learn Programming 2026](/blog/how-to-learn-programming-2026-beginner-roadmap), [Best VS Code Extensions 2026](/blog/best-vscode-extensions-2026-web-developers), and [Best AI Coding Assistants 2026](/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf), [Docker for Beginners 2026](/blog/docker-for-beginners-complete-guide) to explore more.

If you're on Windows, consider [setting up WSL](/blog/linux-wsl-setup-guide-2026-windows-developers) for a proper terminal experience  - Git commands feel more natural in a Linux environment.

## Put Git to Work

Now that you know Git, use it to version control your [developer portfolio website](/blog/build-portfolio-website-2026). Hosting your portfolio on GitHub and deploying from there is a great way to demonstrate your Git skills to employers — see our [free hosting comparison](/blog/best-free-hosting-platforms-2026) for GitHub Pages' current limits and other free options.

## Frequently Asked Questions

### Is Git hard to learn?

The basics (init, add, commit, push, pull) take 1-2 hours to learn. Branching and pull requests take a few days of practice. Advanced features (rebasing, cherry-picking) take weeks but are rarely needed as a beginner.

### Do I need Git for personal projects?

Yes. Even solo projects benefit from version control. You can undo mistakes, track your progress, and your GitHub profile serves as your portfolio. Start using Git for every project from day one.

### What is the difference between Git and GitHub?

Git is a version control tool installed on your computer. GitHub is a cloud platform that hosts Git repositories online and adds collaboration features like pull requests and issues. You can use Git without GitHub but not GitHub without Git.

### How often should I commit?

Commit after every meaningful change  - completing a feature, fixing a bug, or reaching a working state. Small, frequent commits with clear messages are better than large, infrequent ones.

### Can I use Git with VS Code?

Yes. VS Code has excellent built-in Git support  - staging, committing, branching, and resolving conflicts all work through the UI. The GitLens extension adds even more features like inline blame and file history.

### Is GitHub free?

Yes. Free accounts get unlimited public and private repositories, unlimited collaborators, and 2,000 GitHub Actions minutes per month. Paid plans add features like protected branches and advanced security.