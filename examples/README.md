# 📚 Usage examples

Examples demonstrating SDK capabilities and usage.

## 🚀 Quick start

**For beginners:** Run `quick-start.js` — it has detailed comments and step-by-step explanations.

```bash
node examples/quick-start.js
```

## 📝 Main examples

### 1. `basic-usage.js` — Basic usage

Shows how simple it is to work with the API via convenient methods.

```bash
node examples/basic-usage.js
```

**What it demonstrates:**
- Getting your profile
- Working with posts
- Using convenience methods

### 2. `user-friendly.js` — Convenience methods

Demonstrates the benefits of the SDK’s user-friendly methods.

```bash
node examples/user-friendly.js
```

**What it demonstrates:**
- One-line subscription check
- Post statistics
- Notifications
- User clan

### 3. `auto-refresh.js` — Automatic token refresh

Shows how the SDK automatically refreshes the token when it expires.

```bash
node examples/auto-refresh.js
```

**What it demonstrates:**
- Automatic token refresh
- Transparent API usage
- Error handling

## 📖 Full documentation

For full documentation of all methods see **[API_REFERENCE.md](../API_REFERENCE.md)**

## ⚙️ Setup before running

### Install via npm (recommended)

```bash
npm install itd-sdk-js
```

### Install from source

```bash
git clone https://github.com/FriceKa/ITD-SDK-js.git
cd ITD-SDK-js
npm install
```

### Configuration

1. Copy `.env.example` to `.env` and set `ITD_ACCESS_TOKEN`
2. Create a `.cookies` file and paste browser cookies into it

See **[README.md](../README.md)** for details.
