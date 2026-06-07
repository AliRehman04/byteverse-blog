import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const CB = "`";
const TBT = "```";

// Step 1: Create the new category (already created, get the ID)
const catResult = await sql`
  SELECT id FROM categories WHERE slug = 'cybersecurity'
`;
const catId = catResult[0].id;
console.log(`Using existing category: ID ${catId}\n`);

// Step 2: Insert remaining 4 high-volume keyword posts (VPN already inserted as ID 58)
const posts = [
  {
    title: "Best Password Managers in 2026: Free and Paid Compared",
    slug: "best-password-managers-2026",
    excerpt: "We compared the top password managers of 2026 including Bitwarden, 1Password, Dashlane, and more. Here is which one to pick based on your needs and budget.",
    coverImage: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=1200&h=630&fit=crop",
    categoryId: catId,
    metaTitle: "Best Password Managers 2026: Free & Paid Compared",
    metaDescription: "Top 7 password managers compared for 2026. Bitwarden, 1Password, Dashlane, NordPass and more. Free and paid options with pricing and security.",
    keywords: "best password manager 2026, best free password manager, password manager comparison, bitwarden vs 1password, password manager review, safest password manager",
    content: `Using the same password everywhere or keeping them in a notes app is a security disaster waiting to happen. A password manager fixes this by generating, storing, and auto-filling strong unique passwords for every account.

We tested 7 password managers on desktop and mobile over several weeks. Here is how they compare on security, usability, features, and price.

## What a Good Password Manager Needs

- **Zero-knowledge encryption** - The company cannot see your passwords
- **Cross-platform sync** - Works on Windows, Mac, iOS, Android, and browsers
- **Auto-fill** - Fills login forms automatically
- **Password generator** - Creates strong random passwords
- **Breach monitoring** - Alerts you if your credentials appear in data breaches
- **Secure sharing** - Share passwords with family or team safely

## 1. Bitwarden

**Best Free Password Manager**

Bitwarden is open source and offers the most generous free plan of any password manager.

### Free Plan Includes

- Unlimited passwords on unlimited devices
- Password generator
- Secure notes
- Two-factor authentication
- Browser extensions for all major browsers

### Premium ($10/year)

- Advanced 2FA options (YubiKey, FIDO2)
- 1GB encrypted file storage
- Password health reports
- Emergency access
- TOTP authenticator built in

### Why We Like It

Bitwarden is the only password manager where the free plan is genuinely complete. You do not hit a paywall for basic features. The $10/year premium is the cheapest paid option by far.

It is open source which means the code is publicly auditable. The encryption uses AES-256-CBC with PBKDF2-SHA256.

### Downsides

The UI is functional but not as polished as 1Password. Auto-fill can be slightly less smooth on some websites.

## 2. 1Password

**Best Premium Password Manager**

1Password is widely considered the most polished password manager available. It does not have a free plan but the paid experience is excellent.

### Features

- **Watchtower** - Monitors for weak, reused, and breached passwords
- **Travel Mode** - Hides sensitive vaults when crossing borders
- **Multiple vaults** - Organize passwords by category (work, personal, finance)
- **Passkey support** - Full support for the new passwordless standard
- **Family sharing** - Up to 5 family members with individual vaults

### Pricing

- Individual: $2.99/month (billed annually)
- Family: $4.99/month (up to 5 members)
- Business: $7.99/user/month

### Why We Like It

The user experience is the best in the category. Auto-fill works perfectly, the browser extension is fast, and organizing passwords into vaults is intuitive.

### Downsides

No free plan. The price adds up for individuals who just need basic password management.

## 3. Dashlane

**Best for Extra Security Features**

Dashlane bundles a VPN and dark web monitoring with its password manager.

### Features

- Built-in VPN (premium plan)
- Dark web monitoring
- Automatic password changer for supported sites
- Passkey support
- Secure notes and file storage

### Pricing

- Free: 25 passwords on 1 device (very limited)
- Premium: $4.99/month
- Family: $7.49/month (up to 10 members)

### Why We Like It

The automatic password changer is unique. Dashlane can log into supported sites and change your password automatically. The bundled VPN is a nice bonus.

### Downsides

Most expensive option. The free plan is too limited to be useful. The VPN is basic compared to standalone VPN services.

## 4. NordPass

**Best for Simplicity**

NordPass comes from the team behind NordVPN. It focuses on simplicity and fast performance.

### Features

- XChaCha20 encryption (more modern than AES-256)
- Passkey support
- Data breach scanner
- Password health checker
- Secure sharing

### Pricing

- Free: Unlimited passwords but 1 device at a time
- Premium: $1.99/month (billed for 2 years)
- Family: $3.69/month (up to 6 users)

### Why We Like It

NordPass uses XChaCha20 encryption which is newer and potentially more future-proof than AES-256. The interface is clean and fast.

### Downsides

The free plan only lets you be logged in on one device at a time. Fewer advanced features compared to 1Password.

## 5. Keeper

**Best for Enterprise and Families**

Keeper offers strong security with detailed admin controls that work for both families and businesses.

### Features

- Encrypted messaging (KeeperChat)
- Secure file storage (up to 100GB on family plan)
- BreachWatch dark web monitoring
- Admin console for family managers
- Emergency access

### Pricing

- Individual: $2.92/month
- Family: $6.25/month (up to 5 users)
- Business: $3.75/user/month

### Why We Like It

Keeper's family plan includes generous storage and strong admin controls. Parents can manage children's accounts and monitor password health.

### Downsides

No free plan. Some features like BreachWatch cost extra on top of the subscription.

## 6. Apple Passwords (iCloud Keychain)

**Best for Apple Users (Free)**

Built into every Apple device, iCloud Keychain is a capable free password manager if you are in the Apple ecosystem.

### Features

- Completely free
- Built into Safari, iOS, and macOS
- Password generator
- Passkey support
- Breach monitoring
- Shared password groups (family)

### Why We Like It

Zero setup required. If you use an iPhone and Mac, your passwords sync automatically. The new Passwords app in iOS 18 and macOS makes it much more usable than before.

### Downsides

Very limited on Windows and Android. No browser extension for Chrome or Firefox (only Safari). Not ideal if you use mixed platforms.

## 7. Google Password Manager

**Best for Chrome Users (Free)**

Built into Chrome and Android, Google Password Manager handles the basics well.

### Features

- Completely free
- Auto-fills across Chrome and Android
- Password generator
- Security checkup (breach monitoring)
- Passkey support

### Why We Like It

If you live in Chrome, it just works. No extension needed, no setup. The security checkup feature warns you about weak and breached passwords.

### Downsides

Only works well in Chrome. No standalone app. Not encrypted with a master password by default (uses your Google account security). Less secure than dedicated managers.

## Comparison Table

| Manager | Free Plan | Best For | Encryption | Price (Annual) |
|---------|-----------|----------|------------|---------------|
| Bitwarden | Unlimited | Budget users | AES-256 | $10/year |
| 1Password | None | Best UX | AES-256 | $36/year |
| Dashlane | 25 passwords | Extra features | AES-256 | $60/year |
| NordPass | 1 device | Simplicity | XChaCha20 | $24/year |
| Keeper | None | Families | AES-256 | $35/year |
| Apple Passwords | Full | Apple users | AES-256 | Free |
| Google Password | Full | Chrome users | AES-256 | Free |

## Our Recommendation

**Bitwarden** is the best password manager for most people. The free plan is unlimited, the premium is only $10/year, and it works everywhere.

If you want the most polished experience and do not mind paying, **1Password** is worth the premium.

If you are fully in the Apple or Google ecosystem and want zero effort, their built-in options work fine for personal use.

Whatever you pick, using any password manager is infinitely better than reusing passwords or storing them in plain text.`
  },
  {
    title: "How to Check If Your Email Has Been Hacked (2026 Guide)",
    slug: "check-if-email-hacked-2026",
    excerpt: "Think your email might be compromised? Here is exactly how to check if your email has been hacked, what to do if it has, and how to prevent it from happening again.",
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=630&fit=crop",
    categoryId: catId,
    metaTitle: "How to Check If Your Email Has Been Hacked (2026)",
    metaDescription: "Learn how to check if your email has been hacked in 2026. Use these free tools and steps to find breaches, secure your account, and prevent future hacks.",
    keywords: "how to check if email is hacked, has my email been hacked, email hacked what to do, check email breach, have i been pwned, email security check, email compromised",
    content: `Data breaches happen constantly. LinkedIn, Facebook, Twitter, Dropbox, Adobe, and thousands of other services have been breached over the years. If you have been on the internet for more than a few years, your email address has almost certainly appeared in at least one breach.

The question is not if your email has been exposed. It is how bad the exposure is and what you should do about it.

## Step 1: Check Have I Been Pwned

The fastest way to check is **Have I Been Pwned** (haveibeenpwned.com), a free service created by security researcher Troy Hunt.

### How to Use It

1. Go to haveibeenpwned.com
2. Enter your email address
3. Click "pwned?"
4. Check the results

If your email appears in breaches, you will see:
- Which services were breached
- When the breach happened
- What data was exposed (email, password, name, phone, etc.)

### What the Results Mean

- **Paste** - Your credentials appeared in a publicly dumped text file
- **Breach** - A specific service was hacked and your data was part of it
- **Sensitive breach** - The breach is not publicly searchable (adult sites, etc.)

Most people see 3-10 breaches. This is normal given how many breaches have occurred. What matters is what you do next.

## Step 2: Check Your Password Exposure

Have I Been Pwned also lets you check specific passwords at haveibeenpwned.com/Passwords.

This checks if a password has appeared in any known data breach. If it has, stop using it everywhere immediately.

**Important**: The site uses a k-anonymity model. It does not send your full password to the server. Only the first 5 characters of the SHA-1 hash are sent, so it is safe to use.

## Step 3: Check Google's Security Dashboard

If you use Gmail, Google tracks security events for your account:

1. Go to myaccount.google.com/security
2. Check "Recent security activity"
3. Look for sign-ins you do not recognize
4. Review "Your devices" for unknown devices

### Warning Signs

- Sign-ins from locations you have never been
- Devices you do not own listed as active
- Security alerts you did not trigger
- Recovery email or phone changed without your knowledge

## Step 4: Check Your Email Provider's Activity

### Gmail
- Click your profile picture and then "Manage your Google Account"
- Go to Security and then "Recent security activity"
- Scroll down to "Last account activity" in Gmail

### Outlook/Microsoft
- Go to account.microsoft.com/security
- Click "Review activity"
- Check for unfamiliar sign-ins

### Yahoo
- Go to login.yahoo.com/account/activity
- Review recent sign-in activity

## Signs Your Email Is Already Hacked

If any of these are happening, your account may be compromised:

- **Emails you did not send** appear in your Sent folder
- **Password reset emails** arriving for accounts you did not request
- **Friends receiving spam** from your email address
- **Missing emails** - someone is reading and deleting them
- **Account settings changed** - signature, forwarding rules, recovery info modified
- **Cannot log in** - password was changed by someone else
- **Unknown apps** have access to your account

## What to Do If Your Email Is Hacked

### Immediate Steps

**1. Change your password immediately**

Create a strong, unique password. At least 16 characters with a mix of letters, numbers, and symbols. Better yet, use a password manager to generate one.

**2. Enable two-factor authentication (2FA)**

Turn on 2FA right now. Use an authenticator app (Google Authenticator, Authy, or Microsoft Authenticator) instead of SMS. SMS can be intercepted through SIM swapping.

**3. Check forwarding rules**

Hackers often set up email forwarding to receive copies of your incoming emails. Check:
- Gmail: Settings then "Forwarding and POP/IMAP"
- Outlook: Settings then "Mail" then "Forwarding"
- Remove any forwarding addresses you did not add

**4. Review connected apps**

Remove any third-party apps you do not recognize:
- Gmail: myaccount.google.com/permissions
- Outlook: account.microsoft.com/consent/manage
- Revoke access for anything suspicious

**5. Check recovery settings**

Make sure the recovery email and phone number are yours. Hackers change these to maintain access even after you change your password.

### After Securing Your Email

**6. Change passwords on important accounts**

Start with:
- Banking and financial services
- Social media accounts
- Shopping sites (Amazon, etc.)
- Cloud storage (Google Drive, Dropbox, iCloud)
- Any account using the same password as your email

**7. Check financial accounts**

Review bank statements and credit card transactions for unauthorized activity. Set up transaction alerts if your bank offers them.

**8. Warn your contacts**

If spam was sent from your account, let your contacts know not to click any links in those emails.

## How to Prevent Email Hacks

### Use a Password Manager

Stop reusing passwords. A password manager like Bitwarden (free) or 1Password generates and stores unique passwords for every account.

### Enable 2FA Everywhere

Two-factor authentication blocks 99.9% of automated attacks according to Microsoft. Use it on every account that supports it.

### Watch for Phishing

Most email hacks start with phishing. Here is how to spot phishing emails:

- Sender address does not match the company domain
- Urgent language ("Your account will be closed!")
- Links that go to unfamiliar URLs (hover before clicking)
- Attachments you were not expecting
- Poor grammar and formatting

### Keep Software Updated

Outdated browsers and email apps have known vulnerabilities. Enable automatic updates.

### Use Unique Emails for Important Services

Consider using email aliases. Services like SimpleLogin or Apple's Hide My Email create unique addresses for each service, so if one gets breached, your main email stays safe.

## Free Tools to Monitor Your Email Security

| Tool | What It Does | Cost |
|------|-------------|------|
| Have I Been Pwned | Checks email in data breaches | Free |
| Firefox Monitor | Same data, Mozilla interface | Free |
| Google Security Checkup | Reviews Google account security | Free |
| Bitwarden Vault Health | Checks for weak/reused passwords | Free |
| Apple Passwords Security | Monitors for breached passwords | Free (Apple) |

## How Often Should You Check

- **Monthly**: Run your email through Have I Been Pwned
- **Weekly**: Glance at your email account's recent activity
- **Immediately**: When you hear about a major breach in the news
- **Always**: Keep 2FA enabled and use unique passwords

## Bottom Line

Your email is the key to almost every online account. If someone controls your email, they can reset passwords on your bank, social media, and everything else.

Check your email on Have I Been Pwned right now. Enable 2FA. Use a password manager. These three steps stop the vast majority of email-based attacks.`
  },
  {
    title: "Two-Factor Authentication Guide: How to Set Up 2FA Everywhere",
    slug: "two-factor-authentication-guide-2026",
    excerpt: "Two-factor authentication stops 99% of automated attacks. Here is how to set up 2FA on every important account with step-by-step instructions for 2026.",
    coverImage: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&h=630&fit=crop",
    categoryId: catId,
    metaTitle: "2FA Setup Guide 2026: Enable Two-Factor Authentication",
    metaDescription: "Complete guide to two-factor authentication in 2026. Set up 2FA on Google, Apple, Microsoft, social media, and banking apps. Step-by-step instructions.",
    keywords: "two factor authentication, 2fa setup guide, how to enable 2fa, two factor authentication app, google authenticator setup, 2fa security, two step verification",
    content: `Two-factor authentication (2FA) adds a second layer of security beyond your password. Even if someone steals your password, they cannot access your account without the second factor.

Microsoft says 2FA blocks 99.9% of automated attacks. Google reports that accounts with 2FA are 50% less likely to be compromised. Despite this, most people still do not use it.

This guide covers what 2FA is, the different types, and step-by-step setup for every major platform.

## What Is Two-Factor Authentication

2FA requires two different types of proof to verify your identity:

1. **Something you know** - Your password
2. **Something you have** - Your phone, security key, or authenticator app

When you log in, you enter your password (factor 1) and then confirm with a code from your phone (factor 2). Without both, access is denied.

## Types of 2FA (Ranked by Security)

### 1. Hardware Security Keys (Most Secure)

Physical devices like YubiKey or Google Titan that you plug into your computer or tap on your phone.

**Pros**: Phishing-proof, cannot be intercepted remotely, works offline
**Cons**: Costs $25-$60, can be lost, need a backup key
**Best for**: High-value accounts, journalists, activists, executives

### 2. Authenticator Apps (Recommended)

Apps that generate time-based codes (TOTP) that change every 30 seconds.

**Popular options**:
- **Google Authenticator** - Simple, no account needed
- **Microsoft Authenticator** - Backup and sync support
- **Authy** - Multi-device sync and cloud backup
- **2FAS** - Open source, privacy-focused

**Pros**: Free, works offline, more secure than SMS
**Cons**: If you lose your phone without backup codes, you are locked out

### 3. Push Notifications (Convenient)

Apps that send a "Was this you?" notification to approve or deny.

**Examples**: Google prompts, Microsoft Authenticator push, Duo
**Pros**: Very easy to use, no codes to type
**Cons**: Vulnerable to MFA fatigue attacks (attackers spam notifications until you accidentally approve)

### 4. SMS Codes (Better Than Nothing)

A text message with a 6-digit code sent to your phone number.

**Pros**: Easy to set up, no app needed
**Cons**: Vulnerable to SIM swapping, SS7 attacks, and interception. The weakest form of 2FA.

**Our advice**: Use SMS 2FA if it is the only option, but switch to an authenticator app whenever possible.

## How to Set Up 2FA on Major Platforms

### Google / Gmail

1. Go to myaccount.google.com/security
2. Click "2-Step Verification"
3. Click "Get started"
4. Choose your second factor:
   - Google prompts (recommended for Android users)
   - Authenticator app
   - Security key
5. Set up backup codes (save these somewhere safe)
6. Complete the setup

**Tip**: Google also supports passkeys which replace passwords entirely.

### Apple ID / iCloud

1. On iPhone: Settings then [your name] then "Sign-In & Security" then "Two-Factor Authentication"
2. On Mac: System Settings then Apple ID then "Sign-In & Security"
3. Enter your trusted phone number
4. Verify with the code sent to your phone

Apple's 2FA uses push notifications to trusted devices. When you sign in on a new device, all your trusted devices show a verification prompt.

### Microsoft / Outlook

1. Go to account.microsoft.com/security
2. Click "Advanced security options"
3. Under "Two-step verification," click "Turn on"
4. Choose Microsoft Authenticator app (recommended)
5. Scan the QR code with the app
6. Save your recovery code

### Instagram

1. Open the app and go to Settings
2. Tap "Accounts Center" then "Password and security"
3. Tap "Two-factor authentication"
4. Choose your account
5. Select "Authentication app" (recommended)
6. Scan the QR code or enter the key manually
7. Enter the verification code to confirm

### X (Twitter)

1. Go to Settings and Privacy
2. Click "Security and account access" then "Security"
3. Click "Two-factor authentication"
4. Choose Authentication app
5. Scan the QR code
6. Enter the code to verify
7. Save the backup code

**Note**: Twitter removed free SMS 2FA for non-premium users. Use an authenticator app instead.

### GitHub

1. Go to Settings then "Password and authentication"
2. Under "Two-factor authentication," click "Enable"
3. Scan the QR code with your authenticator app
4. Enter the verification code
5. Download and save recovery codes

GitHub strongly recommends 2FA for all developers. It also supports security keys and GitHub Mobile.

### WhatsApp

1. Open Settings then "Account" then "Two-step verification"
2. Tap "Enable"
3. Create a 6-digit PIN
4. Add a recovery email address
5. Confirm

WhatsApp's 2FA is a PIN, not a traditional TOTP code. It prevents someone from registering your number on another device.

### Banking Apps

Most banks now support 2FA through their mobile app. The process varies but generally:

1. Log into your banking app
2. Go to Security Settings
3. Enable biometric login (fingerprint or face)
4. Enable transaction verification
5. Set up push notifications for activity alerts

## Best Practices for 2FA

### Save Your Backup Codes

When you set up 2FA, most services give you backup codes. **Save these immediately.** Store them in:
- A password manager (Bitwarden, 1Password)
- A printed copy in a safe place
- An encrypted note

If you lose your phone and do not have backup codes, recovering your account is extremely difficult.

### Use an Authenticator App, Not SMS

SMS codes can be intercepted through:
- **SIM swapping** - Attacker convinces your carrier to transfer your number
- **SS7 vulnerabilities** - Exploits in the phone network infrastructure
- **Phone theft** - If your SIM is not PIN-locked

Authenticator apps generate codes locally on your device and cannot be intercepted remotely.

### Set Up 2FA on Your Email First

Your email is the master key to everything. If someone controls your email, they can reset passwords on every other account. Secure it first.

### Priority Order for 2FA Setup

1. **Email** (Gmail, Outlook, etc.)
2. **Financial accounts** (banking, investments, crypto)
3. **Social media** (Instagram, Twitter, Facebook)
4. **Cloud storage** (Google Drive, Dropbox, iCloud)
5. **Developer accounts** (GitHub, AWS, Vercel)
6. **Shopping** (Amazon, PayPal)
7. **Everything else**

### Consider a Security Key for Critical Accounts

For your email and financial accounts, a $25 YubiKey provides the strongest protection. It is phishing-proof because it verifies the actual website domain, not just a code.

## What About Passkeys

Passkeys are the next evolution beyond 2FA. They replace passwords entirely using public key cryptography.

**How passkeys work**:
- Your device creates a unique cryptographic key pair for each site
- The private key never leaves your device
- Authentication uses biometrics (fingerprint or face) or device PIN
- No password to steal, no code to intercept

**Services supporting passkeys in 2026**: Google, Apple, Microsoft, GitHub, Amazon, PayPal, and many more.

Passkeys are more secure than any form of 2FA. If a service offers passkey support, use it.

## Common 2FA Mistakes to Avoid

1. **Using the same phone for SMS 2FA and password resets** - If your phone is stolen, both factors are compromised
2. **Not saving backup codes** - You will regret it when you lose your phone
3. **Approving push notifications without checking** - Always verify the location and device
4. **Using SMS when authenticator apps are available** - Upgrade when possible
5. **Not enabling 2FA on your email** - Everything else depends on your email security

## Bottom Line

Enable 2FA on every account that supports it, starting with your email. Use an authenticator app instead of SMS. Save your backup codes. It takes 10 minutes to set up and stops 99% of attacks.

No security measure is easier to implement with a bigger impact than 2FA.`
  },
  {
    title: "How to Create Strong Passwords You Can Actually Remember",
    slug: "how-to-create-strong-passwords-2026",
    excerpt: "Most password advice is impractical. Here is how to create passwords that are both strong and memorable, plus when to use a password manager instead.",
    coverImage: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&h=630&fit=crop",
    categoryId: catId,
    metaTitle: "How to Create Strong Passwords (2026 Guide)",
    metaDescription: "Learn how to create strong passwords you can actually remember. Passphrase method, password manager tips, and common password mistakes to avoid in 2026.",
    keywords: "how to create strong password, strong password generator, password tips, secure password, how to make a good password, password best practices, password security tips",
    content: `The standard password advice is "use 12+ characters with uppercase, lowercase, numbers, and symbols." That is technically correct but practically useless because nobody can remember ${CB}j#K9$mP2@vL7${CB} for 50 different accounts.

Here is a better approach that balances security with usability.

## Why Most Passwords Get Cracked

Before creating better passwords, understand how they get cracked:

### Brute Force

Trying every possible combination. A 6-character password using only lowercase letters has about 300 million combinations. Sounds like a lot, but modern GPUs can crack it in under a second.

### Dictionary Attacks

Trying common words, names, and known passwords. If your password is a single word (even with number substitutions like "p@ssw0rd"), it gets cracked in seconds.

### Credential Stuffing

Using email/password pairs from data breaches on other sites. This is why reusing passwords is dangerous. If LinkedIn gets breached and you use the same password on Gmail, both accounts are compromised.

### Social Engineering

Guessing passwords based on personal information. Birthdays, pet names, favorite teams, children's names. These are all easily findable on social media.

## The Passphrase Method (Recommended)

Instead of a random string of characters, use a **passphrase**: 4-6 random words strung together.

### Examples

- ${CB}correct horse battery staple${CB} (classic XKCD example)
- ${CB}purple monkey dishwasher lamp${CB}
- ${CB}cloud guitar seven breakfast${CB}

### Why This Works

A 4-word passphrase from a list of 7,776 words (like the EFF dice word list) has about 1.3 quintillion possible combinations. That is stronger than most random 10-character passwords.

**Length beats complexity.** A 25-character passphrase is harder to crack than a 10-character random string, and it is actually memorable.

### How to Create a Good Passphrase

1. **Pick 4-6 truly random words** - Do not use song lyrics, quotes, or phrases. Use a random word generator or roll dice
2. **Make it visual** - Create a mental image of the words together. "purple monkey dishwasher lamp" is easy to picture
3. **Add a personal twist** - Capitalize a random word or add a number between words: ${CB}purple Monkey 7 dishwasher lamp${CB}
4. **Keep it at least 16 characters** - 4 average-length words usually hit 20+ characters

### Passphrases vs Random Passwords

| Type | Example | Length | Entropy | Memorable |
|------|---------|--------|---------|-----------|
| Random | ${CB}j#K9$mP2@vL7${CB} | 12 chars | ~79 bits | No |
| Passphrase | ${CB}cloud guitar seven breakfast${CB} | 29 chars | ~51 bits | Yes |
| Strong Passphrase | ${CB}Cloud guitar 9 seven Breakfast!${CB} | 32 chars | ~70 bits | Yes |

The passphrase has slightly less entropy per character but is significantly longer and actually rememberable.

## The Password Manager Approach (Best)

For most accounts, you should not try to remember passwords at all. Use a password manager.

### How It Works

1. You remember **one master password** (use the passphrase method above)
2. The password manager generates and stores unique random passwords for everything else
3. It auto-fills login forms so you never type passwords manually

### Recommended Password Managers

- **Bitwarden** - Free and open source
- **1Password** - Best user experience ($3/month)
- **Apple Passwords** - Free for Apple users
- **Google Password Manager** - Free for Chrome users

### Which Passwords to Memorize

You only need to memorize 2-3 passwords:

1. **Your device password** (computer/phone unlock)
2. **Your password manager master password**
3. **Your primary email password** (backup in case you lose access to your password manager)

Everything else gets generated and stored by the password manager.

## Common Password Mistakes

### Mistake 1: Character Substitution

Replacing letters with numbers or symbols: ${CB}P@ssw0rd${CB}, ${CB}H3llo!${CB}

Attackers know about these substitutions. Cracking tools try them automatically. ${CB}P@ssw0rd${CB} is barely harder to crack than ${CB}password${CB}.

### Mistake 2: Adding a Number at the End

${CB}mypassword1${CB}, ${CB}mypassword2024${CB}, ${CB}mypassword!${CB}

This adds minimal security. Attackers append common numbers and symbols as part of their dictionary attacks.

### Mistake 3: Using Personal Information

Names, birthdays, anniversaries, pet names, favorite sports teams. All of this information is either on your social media or can be guessed.

### Mistake 4: Reusing Passwords

The single biggest security mistake. If you use the same password on 10 sites and one gets breached, all 10 accounts are compromised.

### Mistake 5: Making It Too Short

Every additional character exponentially increases the time to crack. A 6-character password takes seconds. A 16-character password takes centuries.

| Password Length | Lowercase Only | Mixed Case + Numbers + Symbols |
|----------------|---------------|-------------------------------|
| 6 characters | Instant | 5 seconds |
| 8 characters | 5 minutes | 8 hours |
| 10 characters | 2 days | 5 years |
| 12 characters | 200 years | 34,000 years |
| 16 characters | 10+ million years | Trillions of years |

## Password Rules That Actually Matter

Forget the complicated rules. Here is what genuinely matters:

### 1. Make It Long

Minimum 16 characters. Length is the single most important factor.

### 2. Make It Unique

Never reuse a password across different accounts. Period.

### 3. Make It Random

Do not use words, phrases, or patterns that relate to you personally.

### 4. Use 2FA

Even a strong password can be stolen through phishing. Two-factor authentication adds a second barrier.

### 5. Check If It Is Breached

Check your passwords on haveibeenpwned.com/Passwords. If it appears in a breach database, change it immediately.

## How to Create Your Master Password

Your master password for your password manager is the most important password you have. It should be:

1. **A passphrase** - At least 5 random words
2. **At least 20 characters** - Longer is better
3. **Unique** - Never used anywhere else
4. **Memorized** - You should be able to type it without looking it up
5. **Written down initially** - Keep a physical copy in a safe place until you have it memorized

Example: ${CB}winter Telescope 42 orange bumblebee${CB}

Practice typing it several times a day for a week. After that, you will not forget it.

## What About Passkeys

Passkeys are gradually replacing passwords. They use cryptographic keys stored on your device and verified by biometrics (fingerprint or face).

You cannot create a weak passkey. There is nothing to remember, nothing to type, and nothing to steal through phishing.

If a service supports passkeys, use them. They are the future of authentication.

Until passkeys are universal, the password manager + passphrase combination is your best strategy.

## Quick Action Plan

1. **Today**: Install Bitwarden (free) or another password manager
2. **Today**: Create a strong master passphrase using the method above
3. **This week**: Change passwords on your email, banking, and social media to unique generated passwords
4. **This week**: Enable 2FA on your email and financial accounts
5. **Ongoing**: Use the password manager for every new account

This setup takes about 30 minutes and makes you significantly harder to hack than 95% of internet users.`
  },
];

for (const post of posts) {
  const words = post.content.split(/\s+/).length;
  const readingTime = `${Math.ceil(words / 200)} min read`;

  const result = await sql`
    INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, published, meta_title, meta_description, keywords, reading_time)
    VALUES (${post.title}, ${post.slug}, ${post.excerpt}, ${post.content}, ${post.coverImage}, ${post.categoryId}, true, ${post.metaTitle}, ${post.metaDescription}, ${post.keywords}, ${readingTime})
    RETURNING id, title
  `;
  console.log(`✅ ID ${result[0].id}: "${result[0].title}"`);
}

console.log("\nDone! Category + 5 posts published.");
