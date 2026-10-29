// Signature Android « release » : utilise la clé d'envoi Sky Business si elle est fournie
// (variables d'environnement du serveur de fabrication), sinon la clé de test.
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes('SKY_KEYSTORE')) {
      g = g.replace(/signingConfigs\s*\{/, `signingConfigs {
        release {
            if (System.getenv('SKY_KEYSTORE')) {
                storeFile file(System.getenv('SKY_KEYSTORE'))
                storePassword System.getenv('SKY_KEYSTORE_PASSWORD')
                keyAlias System.getenv('SKY_KEY_ALIAS')
                keyPassword System.getenv('SKY_KEY_PASSWORD')
            }
        }`);
      g = g.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, `$1signingConfig System.getenv('SKY_KEYSTORE') ? signingConfigs.release : signingConfigs.debug`);
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
