#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const bundleIdentifier = process.env.SPLITHUB_IOS_BUNDLE_ID || 'ru.splithub.mobile';
const apiKeyPath =
  process.env.EXPO_ASC_API_KEY_PATH ||
  path.join(projectRoot, 'secrets', 'apple', 'AuthKey_79JNYJRUN9.p8');
const keyId = process.env.EXPO_ASC_KEY_ID || '79JNYJRUN9';
const issuerId =
  process.env.EXPO_ASC_ISSUER_ID || '09ff797e-f79b-42d0-99f1-0a5f823e2cc6';
const appStoreConnectApiBaseUrl = 'https://api.appstoreconnect.apple.com/v1';

function requireAppleUtils() {
  const candidates = [];

  try {
    candidates.push(require.resolve('@expo/apple-utils'));
  } catch {}

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const npxRoot = path.join(localAppData, 'npm-cache', '_npx');
    if (fs.existsSync(npxRoot)) {
      for (const entry of fs.readdirSync(npxRoot)) {
        candidates.push(path.join(npxRoot, entry, 'node_modules', '@expo', 'apple-utils'));
      }
    }
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) || candidate.endsWith('.js')) {
        return require(candidate);
      }
    } catch {}
  }

  throw new Error('Cannot find @expo/apple-utils. Run `npx eas-cli@20.4.0 whoami` once and retry.');
}

async function main() {
  if (!fs.existsSync(apiKeyPath)) {
    throw new Error(`Missing App Store Connect API key file: ${apiKeyPath}`);
  }

  const {
    BundleId,
    CapabilityType,
    Token,
  } = requireAppleUtils();

  const key = fs.readFileSync(apiKeyPath, 'utf8');
  const context = {
    token: new Token({ key, keyId, issuerId }),
  };

  let bundle = await BundleId.findAsync(context, { identifier: bundleIdentifier });
  if (!bundle) {
    throw new Error(`Bundle ID not found in Apple Developer account: ${bundleIdentifier}`);
  }

  let capabilities = await bundle.getBundleIdCapabilitiesAsync();
  const hasPush = capabilities.some((capability) =>
    capability.isType(CapabilityType.PUSH_NOTIFICATIONS)
  );

  if (!hasPush) {
    console.log(`Enabling Push Notifications for ${bundleIdentifier} (${bundle.id})`);
    await createPushCapabilityAsync(context, bundle.id, CapabilityType.PUSH_NOTIFICATIONS);
    bundle = await BundleId.infoAsync(context, { id: bundle.id });
    capabilities = await bundle.getBundleIdCapabilitiesAsync();
  }

  const enabled = capabilities.map((capability) => capability.attributes.capabilityType).sort();
  console.log(`Bundle ID: ${bundleIdentifier}`);
  console.log(`Apple opaque ID: ${bundle.id}`);
  console.log(`Enabled capabilities: ${enabled.join(', ') || '(none)'}`);

  if (!enabled.includes(CapabilityType.PUSH_NOTIFICATIONS)) {
    throw new Error('Push Notifications capability is still not enabled.');
  }

  console.log('Push Notifications capability is enabled.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function createPushCapabilityAsync(context, bundleId, capabilityType) {
  const token = await context.token.getToken();
  const response = await fetch(`${appStoreConnectApiBaseUrl}/bundleIdCapabilities`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'bundleIdCapabilities',
        attributes: {
          capabilityType,
        },
        relationships: {
          bundleId: {
            data: {
              id: bundleId,
              type: 'bundleIds',
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apple API failed to enable Push Notifications: HTTP ${response.status} ${body}`);
  }
}
