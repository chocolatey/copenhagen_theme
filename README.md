# Chocolatey Copenhagen Theme by Zendesk

## Building the website

1. Install zcli with `npm install @zendesk/zcli -g`.
1. Run `yarn choco-theme` to build all assets.
1. From the root of this PR, run `npx zcli login -i`.
1. Once authenticated, run `npx zcli themes:preview` to view the site.
1. Navigate to the url the console prints out and login with your Zendesk credentials.
