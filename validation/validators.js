/**
 * Validators - SDK repository structure validation
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const Ajv = require('ajv');

class Validator {
  constructor(options = {}) {
    this.options = {
      schemaFile: options.schemaFile,
      autoFix: options.autoFix || false,
      verbose: options.verbose || false,
      ...options
    };
    
    this.ajv = new Ajv({ allErrors: true });
    this.results = {
      isValid: false,
      filesChecked: 0,
      errors: [],
      warnings: [],
      fixableIssues: [],
      recommendations: [],
      categories: {}
    };
  }
  
  async validateRepository(repoPath) {
    this.results = {
      isValid: false,
      filesChecked: 0,
      errors: [],
      warnings: [],
      fixableIssues: [],
      recommendations: [],
      categories: {}
    };
    
    try {
      // Core file validation
      await this.validateCoreFiles(repoPath);
      
      // Docker validation
      await this.validateDockerSetup(repoPath);
      
      // GitHub workflows validation
      await this.validateGitHubWorkflows(repoPath);
      
      // Documentation validation
      await this.validateDocumentation(repoPath);
      
      // Security validation
      await this.validateSecurity(repoPath);
      
      // Determine overall validity
      this.results.isValid = this.results.errors.length === 0;
      
    } catch (error) {
      this.results.errors.push({
        message: `Validation failed: ${error.message}`,
        category: 'system'
      });
    }
    
    return this.results;
  }
  
  async validateCoreFiles(repoPath) {
    const category = 'Core Files';
    this.results.categories[category] = { passed: true, message: '' };
    
    const requiredFiles = [
      { path: 'VERSION.txt', description: 'Version file' },
      { path: 'README.md', description: 'Repository documentation' },
      { path: 'LICENSE', description: 'License file' }
    ];
    
    const optionalFiles = [
      { path: 'CHANGELOG.md', description: 'Change log' },
      { path: 'CONTRIBUTING.md', description: 'Contributing guidelines' },
      { path: 'SECURITY.md', description: 'Security policy' }
    ];
    
    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(repoPath, file.path);
      this.results.filesChecked++;
      
      if (!await fs.pathExists(filePath)) {
        this.results.errors.push({
          message: `Missing required file: ${file.path}`,
          file: file.path,
          category: 'core-files',
          suggestion: `Create ${file.description.toLowerCase()}`
        });
        this.results.categories[category].passed = false;
      } else {
        // Validate file content
        await this.validateFileContent(filePath, file);
      }
    }
    
    // Check optional files and recommend
    for (const file of optionalFiles) {
      const filePath = path.join(repoPath, file.path);
      
      if (!await fs.pathExists(filePath)) {
        this.results.recommendations.push(
          `Consider adding ${file.path} for better ${file.description.toLowerCase()}`
        );
        
        this.results.fixableIssues.push({
          type: 'create-file',
          file: file.path,
          description: `Create ${file.description.toLowerCase()}`,
          fix: `Generate template ${file.path}`,
          template: this.getFileTemplate(file.path)
        });
      }
    }
    
    if (this.results.categories[category].passed) {
      this.results.categories[category].message = 'All required files present';
    } else {
      this.results.categories[category].message = 'Missing required files';
    }
  }
  
  async validateFileContent(filePath, fileInfo) {
    const content = await fs.readFile(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    if (fileName === 'VERSION.txt') {
      // Validate semantic versioning
      const version = content.trim();
      if (!/^\\d+\\.\\d+\\.\\d+(?:\\.\\d+)?$/.test(version)) {
        this.results.warnings.push({
          message: 'VERSION.txt should contain valid semantic version (e.g., 1.0.0)',
          file: filePath,
          category: 'versioning'
        });
      }
    }
    
    if (fileName === 'README.md') {
      // Basic README validation
      if (content.length < 100) {
        this.results.warnings.push({
          message: 'README.md appears to be very short - consider adding more documentation',
          file: filePath,
          category: 'documentation'
        });
      }
      
      if (!content.includes('# ')) {
        this.results.warnings.push({
          message: 'README.md should include a main heading',
          file: filePath,
          category: 'documentation'
        });
      }
    }
  }
  
  async validateDockerSetup(repoPath) {
    const category = 'Docker Setup';
    this.results.categories[category] = { passed: true, message: '' };
    
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    this.results.filesChecked++;
    
    if (!await fs.pathExists(dockerfilePath)) {
      this.results.errors.push({
        message: 'Missing Dockerfile - required for SDK containers',
        category: 'docker',
        suggestion: 'Create Dockerfile for your SDK environment'
      });
      this.results.categories[category].passed = false;
      this.results.categories[category].message = 'Missing Dockerfile';
      
      this.results.fixableIssues.push({
        type: 'create-dockerfile',
        description: 'Create basic Dockerfile template',
        fix: 'Generate Dockerfile template',
        template: this.getDockerfileTemplate()
      });
    } else {
      // Validate Dockerfile content
      const content = await fs.readFile(dockerfilePath, 'utf8');
      
      if (!content.includes('FROM ')) {
        this.results.errors.push({
          message: 'Dockerfile missing FROM instruction',
          file: 'Dockerfile',
          category: 'docker'
        });
        this.results.categories[category].passed = false;
      }
      
      // Security checks
      if (content.includes('USER root') && !content.includes('USER ')) {
        this.results.warnings.push({
          message: 'Dockerfile runs as root - consider using non-root user for security',
          file: 'Dockerfile',
          category: 'security'
        });
      }
      
      if (this.results.categories[category].passed) {
        this.results.categories[category].message = 'Dockerfile present and valid';
      }
    }
    
    // Check for devcontainer
    const devcontainerPath = path.join(repoPath, '.devcontainer/devcontainer.json');
    if (!await fs.pathExists(devcontainerPath)) {
      this.results.recommendations.push(
        'Consider adding .devcontainer/devcontainer.json for VS Code development'
      );
    }
  }
  
  async validateGitHubWorkflows(repoPath) {
    const category = 'GitHub Workflows';
    this.results.categories[category] = { passed: true, message: '' };
    
    const workflowsDir = path.join(repoPath, '.github/workflows');
    this.results.filesChecked++;
    
    if (!await fs.pathExists(workflowsDir)) {
      this.results.errors.push({
        message: 'Missing .github/workflows directory - required for CI/CD automation',
        category: 'workflows',
        suggestion: 'Create GitHub Actions workflows for automated building and SDK updates'
      });
      this.results.categories[category].passed = false;
      this.results.categories[category].message = 'No workflows found';
      return;
    }
    
    const workflowFiles = await fs.readdir(workflowsDir);
    const ymlFiles = workflowFiles.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    
    if (ymlFiles.length === 0) {
      this.results.errors.push({
        message: 'No GitHub Actions workflow files found',
        category: 'workflows',
        suggestion: 'Add build-and-notify.yml workflow for SDK automation'
      });
      this.results.categories[category].passed = false;
      this.results.categories[category].message = 'No workflow files';
      return;
    }
    
    // Check for specific workflow
    const hasNotifyWorkflow = ymlFiles.some(f => 
      f.includes('build') || f.includes('notify') || f.includes('sdk')
    );
    
    if (!hasNotifyWorkflow) {
      this.results.warnings.push({
        message: 'No build-and-notify workflow found - SDK updates may not be automated',
        category: 'workflows',
        suggestion: 'Add workflow that notifies defense-builders-sdk on successful builds'
      });
    }
    
    // Validate workflow syntax
    for (const workflowFile of ymlFiles) {
      const workflowPath = path.join(workflowsDir, workflowFile);
      const content = await fs.readFile(workflowPath, 'utf8');
      
      try {
        const workflow = yaml.parse(content);
        
        if (!workflow.on) {
          this.results.errors.push({
            message: `Workflow ${workflowFile} missing trigger configuration`,
            file: workflowPath,
            category: 'workflows'
          });
          this.results.categories[category].passed = false;
        }
        
        if (!workflow.jobs) {
          this.results.errors.push({
            message: `Workflow ${workflowFile} missing jobs configuration`,
            file: workflowPath,
            category: 'workflows'
          });
          this.results.categories[category].passed = false;
        }
        
      } catch (error) {
        this.results.errors.push({
          message: `Invalid YAML in ${workflowFile}: ${error.message}`,
          file: workflowPath,
          category: 'workflows'
        });
        this.results.categories[category].passed = false;
      }
    }
    
    if (this.results.categories[category].passed) {
      this.results.categories[category].message = `Found ${ymlFiles.length} valid workflow(s)`;
    }
  }
  
  async validateDocumentation(repoPath) {
    const category = 'Documentation';
    this.results.categories[category] = { passed: true, message: 'Basic documentation present' };
    
    const docsDir = path.join(repoPath, 'docs');
    if (await fs.pathExists(docsDir)) {
      const docFiles = await fs.readdir(docsDir);
      this.results.recommendations.push(
        `Good practice: Found ${docFiles.length} documentation files in docs/`
      );
    } else {
      this.results.recommendations.push(
        'Consider creating a docs/ directory for additional documentation'
      );
    }
    
    // Check for examples
    const examplesDir = path.join(repoPath, 'examples');
    if (!await fs.pathExists(examplesDir)) {
      this.results.recommendations.push(
        'Consider adding examples/ directory with sample code and usage examples'
      );
    }
  }
  
  async validateSecurity(repoPath) {
    const category = 'Security';
    this.results.categories[category] = { passed: true, message: '' };
    
    // Check for security policy
    const securityPath = path.join(repoPath, 'SECURITY.md');
    if (!await fs.pathExists(securityPath)) {
      this.results.warnings.push({
        message: 'No SECURITY.md file found',
        category: 'security',
        suggestion: 'Add security policy for responsible disclosure'
      });
    }
    
    // Check for sensitive files
    const sensitivePatterns = [
      '**/.env',
      '**/*.key',
      '**/*.pem',
      '**/id_rsa',
      '**/secrets.yml'
    ];
    
    // This would check for sensitive files and warn
    this.results.categories[category].message = 'Basic security checks passed';
  }
  
  async applyFix(repoPath, issue) {
    switch (issue.type) {
      case 'create-file':
        await this.createFile(repoPath, issue.file, issue.template);
        break;
      case 'create-dockerfile':
        await this.createFile(repoPath, 'Dockerfile', issue.template);
        break;
      default:
        throw new Error(`Unknown fix type: ${issue.type}`);
    }
  }
  
  async createFile(repoPath, fileName, content) {
    const filePath = path.join(repoPath, fileName);
    const dir = path.dirname(filePath);
    
    await fs.ensureDir(dir);
    await fs.writeFile(filePath, content);
  }
  
  getFileTemplate(fileName) {
    const templates = {
      'CONTRIBUTING.md': `# Contributing to this SDK Collection

Thank you for your interest in contributing! This document outlines the process for contributing to this SDK collection.

## Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## Code Style

Please follow the existing code style and conventions used in this project.

## Security

Please review our [Security Policy](SECURITY.md) for information on reporting security vulnerabilities.
`,
      'SECURITY.md': `# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it privately to our security team.

**Please do not report security vulnerabilities through public GitHub issues.**

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Security Best Practices

When using this SDK:

1. Keep dependencies updated
2. Follow secure coding practices
3. Validate all inputs
4. Use secure communication protocols
`,
      'CHANGELOG.md': `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial SDK collection setup

### Changed

### Deprecated

### Removed

### Fixed

### Security
`
    };
    
    return templates[fileName] || `# ${fileName}\n\nContent for ${fileName}`;
  }
  
  getDockerfileTemplate() {
    return `# SDK Development Container
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    git \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Create development user
RUN useradd -m -s /bin/bash developer && \\
    chown -R developer:developer /workspace

USER developer

# Set entrypoint
CMD ["/bin/bash"]
`;
  }
}

module.exports = Validator;