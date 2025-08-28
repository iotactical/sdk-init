# Getting Started with SDK Init

This guide will walk you through creating your first SDK collection using the Defense Builders SDK Init tool.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **GitHub CLI** (`gh`) installed and authenticated
- **Docker** installed and running
- **Git** configured with your GitHub account
- **GitHub Personal Access Token** with appropriate permissions

## Installation

### Global Installation
```bash
npm install -g @iotactical/sdk-init
```

### Local Development
```bash
git clone https://github.com/iotactical/sdk-init.git
cd sdk-init
npm install
npm run install-global
```

## Quick Start

### 1. Interactive Mode (Recommended)
The easiest way to get started is using the interactive wizard:

```bash
sdk-init interactive
```

This will guide you through:
- Choosing your SDK type and language
- Configuring container settings
- Setting up GitHub integration
- Creating the complete repository structure

### 2. Command Line Mode
For automation or if you know exactly what you want:

```bash
sdk-init create wintak \\
  --type desktop-windows \\
  --language csharp \\
  --description "Windows Team Awareness Kit SDK" \\
  --dotnet-version "8.0"
```

## Step-by-Step Example: Creating WinTAK SDK

Let's walk through creating a Windows TAK SDK collection:

### Step 1: Gather Information
Before starting, decide on:
- **SDK Name**: `wintak` (lowercase, hyphens allowed)
- **Type**: `desktop-windows` 
- **Language**: `csharp`
- **Description**: "Windows Team Awareness Kit SDK"

### Step 2: Run SDK Init
```bash
sdk-init create wintak \\
  --type desktop-windows \\
  --language csharp \\
  --description "Windows Team Awareness Kit SDK" \\
  --container-base "mcr.microsoft.com/dotnet/sdk:8.0" \\
  --dotnet-version "8.0"
```

### Step 3: Review Generated Structure
SDK Init will create:

```
wintak/
├── .github/workflows/
│   └── build-and-notify.yml    # CI/CD automation
├── .devcontainer/
│   └── devcontainer.json       # VS Code dev environment
├── docs/
│   ├── GETTING_STARTED.md
│   └── API_REFERENCE.md
├── examples/
│   └── basic-plugin/
├── Dockerfile                  # Container for SDK
├── VERSION.txt                 # Current version
├── README.md                   # Project documentation
├── LICENSE                     # License file
├── CONTRIBUTING.md             # Contribution guidelines
└── SECURITY.md                 # Security policy
```

### Step 4: Setup GitHub Integration
The tool will:
1. Create the GitHub repository
2. Configure branch protection rules
3. Setup required secrets
4. Configure issue/PR templates

### Step 5: Add Your SDK Files
After generation:
1. Add your actual SDK files to the repository
2. Update the Dockerfile to install your SDK
3. Customize the examples and documentation
4. Test the container build locally

### Step 6: Test Automation
1. Commit and push your changes
2. Watch the CI/CD pipeline run
3. Verify container builds successfully
4. Check that defense-builders-sdk receives the notification

## Available SDK Types

| Type | Languages | Use Case | Example |
|------|-----------|----------|---------|
| `mobile-android` | Java, Kotlin | Android apps | ATAK-CIV |
| `desktop-windows` | C#, C++ | Windows apps | WinTAK |
| `server` | Java, JS, Python, Go | Server APIs | TAK Server |
| `web` | JavaScript, TypeScript | Web apps | Web TAK |
| `embedded` | C, C++, Rust | IoT/Hardware | Hardware TAK |

## Configuration Options

### Container Configuration
- `--container-base`: Base Docker image
- `--java-version`: Java version (for Java/Android SDKs)
- `--gradle-version`: Gradle version (for Android SDKs)
- `--android-api`: Android API level (for Android SDKs)
- `--dotnet-version`: .NET version (for C# SDKs)
- `--node-version`: Node.js version (for JS SDKs)

### GitHub Configuration
- `--org`: GitHub organization (default: iotactical)
- `--private`: Create private repository
- `--skip-automation`: Skip GitHub automation setup

## Validation and Testing

### Validate Repository Structure
```bash
sdk-init validate ./your-sdk-repo
```

### Auto-fix Common Issues
```bash
sdk-init validate ./your-sdk-repo --fix
```

### Setup Automation for Existing Repo
```bash
sdk-init setup-automation your-existing-repo
```

## GitHub Personal Access Token Setup

SDK Init needs a GitHub PAT with these permissions:
- `repo` - Full control of repositories
- `workflow` - Update GitHub Actions workflows
- `write:packages` - Upload to GitHub Container Registry
- `read:packages` - Download from GitHub Container Registry

Create one at: https://github.com/settings/tokens

## Troubleshooting

### Common Issues

**"Command not found: sdk-init"**
- Ensure Node.js 18+ is installed
- Run `npm install -g @iotactical/sdk-init`

**"Permission denied" errors**
- Check your GitHub PAT has correct permissions
- Ensure you have push access to the organization

**"Container build failed"**
- Verify Docker is running
- Check your Dockerfile syntax
- Ensure base image is accessible

**"Workflow validation failed"**
- Check YAML syntax in workflow files
- Verify all required secrets are set

### Getting Help

- Run `sdk-init --help` for command help
- Run `sdk-init info` to check your environment
- Check the [troubleshooting guide](TROUBLESHOOTING.md)
- Open an issue on GitHub: https://github.com/iotactical/sdk-init/issues

## Next Steps

After creating your SDK collection:

1. **Customize the SDK**: Add your actual SDK files and configuration
2. **Update Documentation**: Modify README and docs to match your SDK
3. **Add Examples**: Create practical examples for users
4. **Test Thoroughly**: Ensure the container builds and automation works
5. **Register with Defense Builders**: Submit PR to add your SDK to the registry
6. **Engage the Community**: Share your SDK collection with the Defense Builders community

## Best Practices

- Follow semantic versioning for releases
- Keep your documentation up to date
- Include comprehensive examples
- Test your SDK collection regularly
- Respond to community feedback and issues
- Follow security best practices
- Keep dependencies updated

---

**Welcome to the Defense Builders SDK ecosystem!** 🚀