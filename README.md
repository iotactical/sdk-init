# SDK Init - Defense Builders SDK Collection Automation

A comprehensive toolkit to automate the creation and onboarding of new SDK collections for the Defense Builders ecosystem. This tool makes it easy for the open source community to contribute new SDK collections following established patterns and best practices.

## 🎯 **Purpose**

This project solves the complexity of manually setting up new SDK collections by automating:

- Repository creation and structure
- CI/CD workflow generation
- Container and devcontainer setup
- Integration with defense-builders-sdk
- PAT generation and secret management
- Documentation and community guidelines

## 🏗️ **Architecture**

```
sdk-init/
├── cli/                     # Command-line interface
│   ├── commands/           # Individual CLI commands
│   └── sdk-init           # Main CLI executable
├── templates/              # Repository templates
│   ├── base-sdk/          # Base SDK repository template
│   ├── workflows/         # GitHub Actions templates
│   └── containers/        # Docker & devcontainer templates
├── automation/             # GitHub automation scripts
│   ├── github-setup.js    # Repository and secret creation
│   └── pat-manager.js     # PAT generation and management
├── validation/             # Structure validation
│   └── validators.js      # SDK structure validators
├── docs/                   # Documentation templates
└── examples/              # Example implementations
```

## 🚀 **Usage**

### Quick Start
```bash
# Initialize a new SDK collection
./cli/sdk-init create wintak --type desktop --language csharp

# Validate existing SDK structure  
./cli/sdk-init validate /path/to/sdk-repo

# Setup automation for existing repo
./cli/sdk-init setup-automation atak-civ
```

### Interactive Mode
```bash
./cli/sdk-init interactive
```

## 📋 **Supported SDK Types**

| Type | Language | Platform | Example |
|------|----------|----------|---------|
| `mobile-android` | Java/Kotlin | Android | ATAK-CIV |
| `desktop-windows` | C#/.NET | Windows | WinTAK |
| `server` | Multiple | Linux/Docker | TAK Server |
| `web` | JavaScript/TypeScript | Browser | Web TAK |
| `embedded` | C/C++ | IoT/Hardware | Custom Hardware |

## 🔧 **Features**

### 1. **Repository Creation**
- GitHub repository setup with proper structure
- Branch protection rules
- Issue/PR templates
- License and compliance files

### 2. **CI/CD Automation**
- GitHub Actions workflows
- Container registry integration
- Automated SDK version updates
- Integration with defense-builders-sdk

### 3. **Container Setup**
- Dockerfile generation
- Devcontainer configuration  
- Multi-architecture builds
- Security hardening

### 4. **Community Integration**
- Contributing guidelines
- Code of conduct
- Security policies
- Documentation templates

### 5. **Validation & Testing**
- SDK structure validation
- Workflow testing
- Container build verification
- Integration testing

## 🛠️ **Technical Requirements**

- Node.js 18+
- GitHub CLI (`gh`)
- Docker
- Git
- Valid GitHub Personal Access Token

## 📖 **Example: Creating WinTAK SDK**

```bash
# Create new WinTAK SDK collection
./cli/sdk-init create wintak \
  --type desktop-windows \
  --language csharp \
  --container-base mcr.microsoft.com/dotnet/sdk:8.0 \
  --description "Windows Team Awareness Kit SDK" \
  --java-version "N/A" \
  --dotnet-version "8.0"

# This creates:
# - Repository: github.com/iotactical/wintak
# - CI workflow with .NET builds
# - Windows container setup
# - Integration with defense-builders-sdk
# - Community documentation
```

## 🔐 **Security Considerations**

- PAT tokens stored securely in GitHub Secrets
- Container images scanned for vulnerabilities  
- SBOM generation for all builds
- Supply chain security best practices
- Automated security updates

## 🤝 **Community Contribution**

This tool empowers community members to:

1. **Create SDK Collections**: Easy onboarding for new TAK ecosystem SDKs
2. **Follow Best Practices**: Automated compliance with security and quality standards
3. **Integrate Seamlessly**: Automatic integration with existing defense-builders infrastructure
4. **Maintain Quality**: Built-in validation and testing frameworks

## 📚 **Documentation**

- [CLI Reference](docs/CLI_REFERENCE.md)
- [Template Guide](docs/TEMPLATE_GUIDE.md)  
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Community Examples](examples/)

## 🎯 **Roadmap**

- [ ] v1.0: Core CLI and automation
- [ ] v1.1: Advanced container templates
- [ ] v1.2: Multi-language SDK support
- [ ] v1.3: Advanced security integrations
- [ ] v2.0: Web-based SDK builder interface

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Making SDK collection creation accessible to everyone in the Defense Builders community.** 🚀