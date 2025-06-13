# MOC Explorer Plugin - Installation Guide

## Quick Start with BRAT

1. **Install BRAT Plugin** (if you haven't already)
   - Go to **Settings** → **Community plugins**
   - Click **Browse** and search for "BRAT"
   - Install and enable "Obsidian 42 - BRAT"

2. **Add MOC Explorer via BRAT**
   - Open **Settings** → **BRAT**
   - Click **Add Beta plugin**
   - Paste this URL: `https://github.com/your-username/obsidian-moc-explorer`
   - Click **Add Plugin**
   - Enable "MOC Explorer" in **Community plugins**

3. **Configure the Plugin**
   - Go to **Settings** → **MOC Explorer**
   - Set your MOC folder path (default: `Atlas/Maps`)
   - Adjust other settings as needed

4. **Open MOC Explorer**
   - Click the network icon (🔗) in the left ribbon
   - Or use **Cmd/Ctrl + P** → "Open MOC Explorer"

## Manual Installation

If you prefer to install manually:

1. **Download Files**
   - Download the latest release from GitHub
   - Or clone: `git clone https://github.com/your-username/obsidian-moc-explorer.git`

2. **Copy to Obsidian**
   ```
   YourVault/
   └── .obsidian/
       └── plugins/
           └── moc-explorer/
               ├── main.js
               ├── manifest.json
               └── styles.css
   ```

3. **Build (if from source)**
   ```bash
   cd obsidian-moc-explorer
   npm install
   npm run build
   ```

4. **Enable Plugin**
   - Reload Obsidian
   - Go to **Settings** → **Community plugins**
   - Enable "MOC Explorer"

## Configuration

### Essential Settings

- **MOC Folder Path**: Where your MOCs are stored
  - Default: `Atlas/Maps`
  - Example: `02 Areas/Maps`
  
- **Auto Refresh**: Updates visualization when files change
  - Recommended: `ON`

### Visual Settings

- **Color Scheme**: Choose purple or blue theme
- **Maximum Node Size**: Limit how large nodes can grow (20-100px)
- **Show Connection Strength**: Display link thickness based on connections

### Performance Settings

- **Minimum Connections**: Hide MOCs with fewer connections (0-10)
- **Connection Strength Display**: Show/hide connection indicators

## First Use

1. **Open the Plugin**
   - Click the ribbon icon or use command palette

2. **Wait for Scanning**
   - Plugin will scan your vault for MOCs
   - Look for "Scanning MOCs..." notification

3. **Explore Your MOCs**
   - Hover over nodes for details
   - Click nodes to open MOC files
   - Use filters and search

## Troubleshooting

### No MOCs Appearing?

**Check folder path:**
- Verify MOC folder path in settings
- Try changing to your actual MOC folder

**MOC detection:**
- Ensure files contain "MOC" or "Map" in filename
- Or place files in configured MOC folder
- Files should have some internal or external links

### Performance Issues?

**Reduce load:**
- Increase "Minimum Connections" filter
- Decrease "Maximum Node Size"
- Turn off "Auto Refresh" temporarily

**Large vaults:**
- Consider organizing MOCs in dedicated folder
- Use search/filter features
- Split large MOC collections

### Missing Connections?

**Link format:**
- Use proper Obsidian links: `[[MOC Name]]`
- Check for typos in MOC names
- Ensure linked MOCs exist

**Refresh data:**
- Click "🔄 Refresh" button
- Or restart Obsidian
- Check console (Ctrl+Shift+I) for errors

## Plugin Updates

### Via BRAT (Automatic)
- BRAT will notify you of updates
- Click update notification to install

### Manual Updates
- Download new version
- Replace files in plugin folder
- Restart Obsidian

## Uninstalling

1. **Disable Plugin**
   - Settings → Community plugins
   - Turn off "MOC Explorer"

2. **Remove Files** (optional)
   - Delete `YourVault/.obsidian/plugins/moc-explorer/`

## Support

Need help? Check these resources:

- 📖 **README**: Full documentation
- 🐛 **Issues**: Report bugs on GitHub
- 💬 **Discussions**: Ask questions on GitHub
- 🎥 **Demo**: See plugin in action (coming soon)

## Advanced Configuration

### Custom MOC Detection

The plugin detects MOCs through:
1. Files in configured MOC folder
2. Files with "MOC" or "Map" in name
3. Files with high link density
4. Files marked with specific frontmatter

### Integration with Other Plugins

Works well with:
- **Dataview**: Enhanced MOC queries
- **Graph Analysis**: Complementary visualizations
- **Quick Switcher++**: Fast MOC navigation
- **Templater**: MOC creation templates

### Vault Structure Recommendations

```
YourVault/
├── Atlas/
│   ├── Maps/          ← Configure this as MOC folder
│   │   ├── Main MOCs/
│   │   ├── Topic MOCs/
│   │   └── System MOCs/
│   └── Sources/
├── Areas/
├── Resources/
└── Archives/
```

This structure works optimally with the plugin's detection algorithms.