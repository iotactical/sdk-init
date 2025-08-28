/**
 * Validate Command - Validate SDK repository structure
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Validator = require('../../validation/validators');

class ValidateCommand {
  static async execute(repoPath, options, command) {
    const globalOptions = command.parent.opts();
    
    console.log(chalk.blue.bold(`🔍 Validating SDK repository: ${repoPath}\\n`));
    
    try {
      // Check if path exists
      if (!await fs.pathExists(repoPath)) {
        throw new Error(`Path does not exist: ${repoPath}`);
      }
      
      // Initialize validator
      const validator = new Validator({
        schemaFile: options.schema,
        autoFix: options.fix,
        verbose: globalOptions.verbose
      });
      
      // Run validation
      const results = await validator.validateRepository(repoPath);
      
      // Display results
      this.displayResults(results, repoPath);
      
      // Auto-fix issues if requested
      if (options.fix && results.fixableIssues.length > 0) {
        await this.autoFixIssues(validator, repoPath, results.fixableIssues);
      }
      
      // Exit with appropriate code
      const exitCode = results.isValid ? 0 : (results.errors.length > 0 ? 2 : 1);
      process.exit(exitCode);
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Validation failed:'));
      console.error(chalk.red(error.message));
      
      if (globalOptions.verbose) {
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  }
  
  static displayResults(results, repoPath) {
    console.log(chalk.blue(`📋 Validation Results for: ${path.basename(repoPath)}\\n`));
    
    // Overall status
    if (results.isValid) {
      console.log(chalk.green.bold('✅ Repository structure is valid\\n'));
    } else {
      console.log(chalk.red.bold('❌ Repository structure has issues\\n'));
    }
    
    // Summary statistics
    console.log(chalk.cyan('📊 Summary:'));
    console.log(`  Files checked: ${results.filesChecked}`);
    console.log(`  Errors: ${chalk.red(results.errors.length)}`);
    console.log(`  Warnings: ${chalk.yellow(results.warnings.length)}`);
    console.log(`  Fixable issues: ${chalk.blue(results.fixableIssues.length)}`);
    console.log();
    
    // Display errors
    if (results.errors.length > 0) {
      console.log(chalk.red.bold('🚨 Errors:'));
      results.errors.forEach((error, index) => {
        console.log(chalk.red(`  ${index + 1}. ${error.message}`));
        if (error.file) {
          console.log(chalk.gray(`     File: ${error.file}`));
        }
        if (error.suggestion) {
          console.log(chalk.blue(`     Suggestion: ${error.suggestion}`));
        }
        console.log();
      });
    }
    
    // Display warnings
    if (results.warnings.length > 0) {
      console.log(chalk.yellow.bold('⚠️  Warnings:'));
      results.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`  ${index + 1}. ${warning.message}`));
        if (warning.file) {
          console.log(chalk.gray(`     File: ${warning.file}`));
        }
        console.log();
      });
    }
    
    // Display validation categories
    console.log(chalk.cyan.bold('📋 Validation Categories:'));
    Object.entries(results.categories).forEach(([category, status]) => {
      const icon = status.passed ? '✅' : '❌';
      const color = status.passed ? chalk.green : chalk.red;
      console.log(`  ${icon} ${color(category)}: ${status.message}`);
    });
    console.log();
    
    // Show fixable issues
    if (results.fixableIssues.length > 0) {
      console.log(chalk.blue.bold('🔧 Auto-fixable Issues:'));
      results.fixableIssues.forEach((issue, index) => {
        console.log(chalk.blue(`  ${index + 1}. ${issue.description}`));
        console.log(chalk.gray(`     Fix: ${issue.fix}`));
      });
      console.log();
      console.log(chalk.blue('💡 Run with --fix to automatically resolve these issues'));
      console.log();
    }
    
    // Recommendations
    if (results.recommendations.length > 0) {
      console.log(chalk.magenta.bold('💡 Recommendations:'));
      results.recommendations.forEach((rec, index) => {
        console.log(chalk.magenta(`  ${index + 1}. ${rec}`));
      });
      console.log();
    }
  }
  
  static async autoFixIssues(validator, repoPath, fixableIssues) {
    console.log(chalk.blue.bold('🔧 Auto-fixing issues...\\n'));
    
    let fixedCount = 0;
    
    for (const issue of fixableIssues) {
      try {
        console.log(chalk.blue(`Fixing: ${issue.description}`));
        
        await validator.applyFix(repoPath, issue);
        
        console.log(chalk.green('  ✅ Fixed'));
        fixedCount++;
        
      } catch (error) {
        console.log(chalk.red(`  ❌ Failed to fix: ${error.message}`));
      }
    }
    
    console.log();
    console.log(chalk.green(`✅ Fixed ${fixedCount} of ${fixableIssues.length} issues`));
    
    if (fixedCount < fixableIssues.length) {
      console.log(chalk.yellow(`⚠️  ${fixableIssues.length - fixedCount} issues could not be automatically fixed`));
    }
    
    console.log();
  }
}

module.exports = ValidateCommand;