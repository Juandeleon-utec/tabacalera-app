const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const JAVA_FILES = ['ImpresionTermicaModule.java', 'ImpresionTermicaPackage.java'];

function withCopyJavaFiles(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const pkg = (config.android && config.android.package) || 'com.montepaz.tabacalera';
      const pkgPath = pkg.split('.').join(path.sep);
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', pkgPath
      );

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const srcDir = path.join(config.modRequest.projectRoot, 'modules', 'android');

      for (const archivo of JAVA_FILES) {
        const src = path.join(srcDir, archivo);
        const dest = path.join(destDir, archivo);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        } else {
          console.warn(`[withImpresionTermica] No encontrado: ${src}`);
        }
      }

      return config;
    },
  ]);
}

function withRegistrarPackage(config) {
  return withMainApplication(config, (config) => {
    let src = config.modResults.contents;

    if (src.includes('ImpresionTermicaPackage')) {
      return config;
    }

    const isKotlin = config.modResults.language === 'kt';

    if (isKotlin) {
      src = src.replace(
        'import expo.modules.ReactNativeHostWrapper',
        'import expo.modules.ReactNativeHostWrapper\nimport com.montepaz.tabacalera.ImpresionTermicaPackage'
      );
      // Kotlin template: packages list via apply block
      src = src.replace(
        /\/\/ add\(MyReactNativePackage\(\)\)/,
        '// add(MyReactNativePackage())\n        add(ImpresionTermicaPackage())'
      );
    } else {
      // Java template
      src = src.replace(
        'import java.util.List;',
        'import java.util.List;\nimport com.montepaz.tabacalera.ImpresionTermicaPackage;'
      );
      src = src.replace(
        /return packages;/,
        'packages.add(new ImpresionTermicaPackage());\n          return packages;'
      );
    }

    config.modResults.contents = src;
    return config;
  });
}

module.exports = function withImpresionTermica(config) {
  config = withCopyJavaFiles(config);
  config = withRegistrarPackage(config);
  return config;
};
