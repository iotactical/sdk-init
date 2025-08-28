# Example: Creating WinTAK SDK Collection

This example demonstrates creating a complete WinTAK SDK collection from scratch using SDK Init.

## Scenario

We want to create a Windows Team Awareness Kit (WinTAK) SDK collection that allows developers to:
- Build WinTAK plugins using C#/.NET
- Use VS Code with devcontainers for development
- Automatically build and distribute SDK containers
- Integrate with the Defense Builders ecosystem

## Prerequisites

- Windows or WSL2 environment
- Docker Desktop with Windows containers support
- GitHub account with iotactical organization access
- GitHub Personal Access Token with required permissions

## Step 1: Planning

**SDK Configuration:**
- Name: `wintak`
- Type: `desktop-windows`
- Language: `csharp`
- Base Container: `mcr.microsoft.com/dotnet/sdk:8.0`
- .NET Version: `8.0`

## Step 2: Interactive Creation

```bash
$ sdk-init interactive

🧙 Interactive SDK Creation Wizard

This wizard will guide you through creating a new SDK collection for the Defense Builders ecosystem.

📋 Basic Information

? SDK name (lowercase, hyphens allowed): wintak
? SDK description: Windows Team Awareness Kit SDK for Defense Builders
? SDK type: 🖥️ Desktop Windows (WinTAK style)

⚙️ SDK Configuration

? Primary programming language: C#/.NET
? .NET version: 8.0

🐳 Container Configuration

? Base container image: mcr.microsoft.com/dotnet/sdk:8.0
? Include VS Code devcontainer configuration? Yes

🐙 GitHub Configuration

? GitHub organization: iotactical
? Create private repository? No
? Setup GitHub automation (CI/CD, secrets, etc.)? Yes

📋 Configuration Summary

Basic Information:
  Name: wintak
  Description: Windows Team Awareness Kit SDK for Defense Builders
  Type: desktop-windows
  Language: csharp

Technical Configuration:
  .NET Version: 8.0

Container Configuration:
  Base Image: mcr.microsoft.com/dotnet/sdk:8.0
  Include Devcontainer: Yes

GitHub Configuration:
  Organization: iotactical
  Repository: iotactical/wintak
  Private: No
  Setup Automation: Yes

? Create SDK collection with this configuration? Yes

🚀 Creating SDK collection...

📁 Creating repository structure...
✅ Repository structure created

🌐 Setting up GitHub repository...
🏗️ Creating GitHub repository: iotactical/wintak
✅ Repository created successfully
🛡️ Setting up branch protection rules
✅ Branch protection configured
🔒 Setting up repository secrets
✅ Secrets configured

⚙️ Setting up automation...
✅ Automation configured

🔍 Validating created structure...
✅ Structure validation passed

✅ Successfully created SDK collection: wintak
📁 Local path: /current/directory/wintak
🌐 GitHub: https://github.com/iotactical/wintak

📝 Next steps:
  1. Review and customize the generated files
  2. Add your SDK files to the appropriate directories
  3. Configure GitHub secrets (PAT tokens)
  4. Push changes and test the CI/CD workflow
  5. Submit PR to defense-builders-sdk to register your SDK
```

## Step 3: Review Generated Structure

```bash
$ cd wintak
$ tree
wintak/
├── .devcontainer/
│   └── devcontainer.json
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       └── build-and-notify.yml
├── docs/
│   ├── API_REFERENCE.md
│   ├── GETTING_STARTED.md
│   └── TROUBLESHOOTING.md
├── examples/
│   ├── basic-plugin/
│   │   ├── Program.cs
│   │   ├── WinTAKPlugin.csproj
│   │   └── README.md
│   └── advanced-plugin/
│       ├── AdvancedPlugin.cs
│       ├── AdvancedPlugin.csproj
│       └── README.md
├── sdk/
│   ├── WinTAK.Core.dll
│   ├── WinTAK.SDK.dll
│   └── documentation/
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
├── LICENSE
├── README.md
├── SECURITY.md
└── VERSION.txt
```

## Step 4: Customize Dockerfile

The generated Dockerfile provides a good starting point:

```dockerfile
# WinTAK SDK Development Container
FROM mcr.microsoft.com/dotnet/sdk:8.0

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install WinTAK SDK (customize this section)
COPY sdk/ /opt/wintak-sdk/
ENV WINTAK_SDK_PATH=/opt/wintak-sdk

# Set working directory
WORKDIR /workspace

# Create development user
RUN useradd -m -s /bin/bash developer && \
    chown -R developer:developer /workspace

USER developer

# Set entrypoint
CMD ["/bin/bash"]
```

## Step 5: Add SDK Files

Add your actual WinTAK SDK files:

```bash
# Copy your WinTAK SDK files
cp -r /path/to/wintak-sdk/* ./sdk/

# Update VERSION.txt
echo "1.0.0" > VERSION.txt

# Customize examples
# Edit examples/basic-plugin/Program.cs with actual WinTAK API usage
```

## Step 6: Configure GitHub Secrets

Add required secrets to your GitHub repository:

1. Go to `https://github.com/iotactical/wintak/settings/secrets/actions`
2. Add `DEFENSE_BUILDERS_PAT` with your GitHub token

## Step 7: Test Locally

```bash
# Build container locally
docker build -t wintak-sdk:test .

# Test the container
docker run -it --rm -v $(pwd):/workspace wintak-sdk:test

# Inside container, test building an example
cd examples/basic-plugin
dotnet build
```

## Step 8: Push and Test CI/CD

```bash
git add .
git commit -m "Initial WinTAK SDK setup"
git push origin main
```

The CI/CD pipeline will:
1. Build the container image
2. Push to GitHub Container Registry as `ghcr.io/iotactical/dbsdk-wintak`
3. Notify defense-builders-sdk of the new version

## Step 9: Register with Defense Builders

Create a PR to `defense-builders-sdk` to add your SDK to `sdk-versions.json`:

```json
{
  "wintak": {
    "name": "WinTAK SDK",
    "description": "Windows Team Awareness Kit SDK",
    "versions": [
      {
        "version": "1.0.0",
        "label": "1.0.0 (Latest)",
        "container": "ghcr.io/iotactical/dbsdk-wintak:1.0.0",
        "dotnet_version": "8.0",
        "is_latest": true,
        "release_notes": "Initial WinTAK SDK release"
      }
    ],
    "templates": [
      {
        "id": "basic",
        "name": "Basic WinTAK Plugin",
        "description": "Simple WinTAK plugin with core functionality"
      },
      {
        "id": "advanced",
        "name": "Advanced WinTAK Plugin",
        "description": "Complex plugin with UI components and advanced features"
      }
    ]
  }
}
```

## Expected Results

After completion, you'll have:

✅ **Complete SDK Collection**
- Fully configured WinTAK SDK repository
- Container-based development environment
- VS Code devcontainer support

✅ **Automated CI/CD**
- Builds trigger on code changes
- Containers pushed to registry automatically
- Defense Builders SDK notified of updates

✅ **Community Ready**
- Professional documentation
- Example projects
- Contributing guidelines
- Issue templates

✅ **Defense Builders Integration**
- Listed in SDK catalog
- Available in Codespaces
- Following ecosystem patterns

## Customization Options

After initial creation, you can:

- **Add more examples**: Create additional plugin templates
- **Enhance documentation**: Add API references, tutorials
- **Configure build tools**: Add MSBuild configurations, NuGet packages
- **Setup testing**: Add unit test frameworks and CI test runners
- **Add IDE support**: Configure for Visual Studio, VS Code extensions

## Community Contribution

Your WinTAK SDK collection can now be used by:
- Defense contractors building WinTAK plugins
- Open source developers extending WinTAK capabilities  
- Students learning tactical awareness systems
- Researchers prototyping new features

The automated infrastructure ensures your SDK stays current and accessible to the entire Defense Builders community.

---

**WinTAK SDK collection is now ready for the community!** 🎉