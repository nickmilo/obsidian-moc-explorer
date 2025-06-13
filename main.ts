import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, TFile, Notice } from 'obsidian';

// Plugin settings interface
interface MOCExplorerSettings {
	mocFolderPath: string;
	showConnectionStrength: boolean;
	maxNodeSize: number;
	colorScheme: string;
	autoRefresh: boolean;
	minimumConnections: number;
}

// Default settings
const DEFAULT_SETTINGS: MOCExplorerSettings = {
	mocFolderPath: 'Atlas/Maps',
	showConnectionStrength: true,
	maxNodeSize: 50,
	colorScheme: 'purple',
	autoRefresh: true,
	minimumConnections: 1
};

// MOC data structure
interface MOCNode {
	id: string;
	name: string;
	path: string;
	connections: number;
	inlinks: string[];
	outlinks: string[];
	type: 'main' | 'sub' | 'system';
	category: string;
}

interface MOCLink {
	source: string;
	target: string;
	strength: number;
}

export const VIEW_TYPE_MOC_EXPLORER = "moc-explorer-view";

// MOC Explorer View
export class MOCExplorerView extends ItemView {
	private mocData: { nodes: MOCNode[], links: MOCLink[] } = { nodes: [], links: [] };
	private svg: SVGElement | null = null;
	private settings: MOCExplorerSettings;

	constructor(leaf: WorkspaceLeaf, settings: MOCExplorerSettings) {
		super(leaf);
		this.settings = settings;
	}

	getViewType() {
		return VIEW_TYPE_MOC_EXPLORER;
	}

	getDisplayText() {
		return "MOC Explorer";
	}

	getIcon() {
		return "network";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		
		// Create main container
		const mainContainer = container.createDiv({ cls: "moc-explorer-container" });
		
		// Create toolbar
		const toolbar = mainContainer.createDiv({ cls: "moc-explorer-toolbar" });
		
		// Refresh button
		const refreshBtn = toolbar.createEl("button", { 
			text: "🔄 Refresh",
			cls: "mod-cta"
		});
		refreshBtn.addEventListener("click", () => this.refreshData());
		
		// Filter dropdown
		const filterSelect = toolbar.createEl("select", { cls: "dropdown" });
		filterSelect.createEl("option", { text: "All MOCs", value: "all" });
		filterSelect.createEl("option", { text: "Main MOCs", value: "main" });
		filterSelect.createEl("option", { text: "Sub MOCs", value: "sub" });
		filterSelect.createEl("option", { text: "System MOCs", value: "system" });
		filterSelect.addEventListener("change", (e) => {
			const target = e.target as HTMLSelectElement;
			this.filterNodes(target.value);
		});
		
		// Search input
		const searchInput = toolbar.createEl("input", { 
			type: "text",
			placeholder: "Search MOCs...",
			cls: "search-input"
		});
		searchInput.addEventListener("input", (e) => {
			const target = e.target as HTMLInputElement;
			this.searchNodes(target.value);
		});
		
		// Create visualization container
		const vizContainer = mainContainer.createDiv({ cls: "moc-viz-container" });
		
		// Create SVG
		this.svg = vizContainer.createSvg("svg", {
			attr: {
				width: "100%",
				height: "600px"
			}
		});
		
		// Create stats panel
		const statsPanel = mainContainer.createDiv({ cls: "moc-stats-panel" });
		this.createStatsPanel(statsPanel);
		
		// Load initial data
		await this.refreshData();
		
		// Auto-refresh setup
		if (this.settings.autoRefresh) {
			this.setupAutoRefresh();
		}
	}

	private createStatsPanel(container: HTMLElement) {
		container.createEl("h3", { text: "MOC Statistics" });
		
		const statsGrid = container.createDiv({ cls: "stats-grid" });
		
		const totalStat = statsGrid.createDiv({ cls: "stat-item" });
		totalStat.createEl("div", { text: "0", cls: "stat-value", attr: { id: "total-mocs" } });
		totalStat.createEl("div", { text: "Total MOCs", cls: "stat-label" });
		
		const connectionsStat = statsGrid.createDiv({ cls: "stat-item" });
		connectionsStat.createEl("div", { text: "0", cls: "stat-value", attr: { id: "total-connections" } });
		connectionsStat.createEl("div", { text: "Connections", cls: "stat-label" });
		
		const orphansStat = statsGrid.createDiv({ cls: "stat-item" });
		orphansStat.createEl("div", { text: "0", cls: "stat-value", attr: { id: "orphan-mocs" } });
		orphansStat.createEl("div", { text: "Orphaned", cls: "stat-label" });
		
		const avgStat = statsGrid.createDiv({ cls: "stat-item" });
		avgStat.createEl("div", { text: "0", cls: "stat-value", attr: { id: "avg-connections" } });
		avgStat.createEl("div", { text: "Avg Links", cls: "stat-label" });
	}

	private async refreshData() {
		try {
			new Notice("Scanning MOCs...");
			this.mocData = await this.scanMOCs();
			this.renderVisualization();
			this.updateStats();
			new Notice(`Found ${this.mocData.nodes.length} MOCs`);
		} catch (error) {
			new Notice("Error scanning MOCs: " + error.message);
			console.error("MOC Explorer error:", error);
		}
	}

	private async scanMOCs(): Promise<{ nodes: MOCNode[], links: MOCLink[] }> {
		const nodes: MOCNode[] = [];
		const links: MOCLink[] = [];
		
		// Get all files in the MOC folder
		const mocFolder = this.app.vault.getAbstractFileByPath(this.settings.mocFolderPath);
		if (!mocFolder || !(mocFolder instanceof TFile)) {
			// If folder doesn't exist, scan entire vault for MOCs
			return this.scanEntireVault();
		}
		
		const mocFiles = this.app.vault.getMarkdownFiles()
			.filter(file => file.path.startsWith(this.settings.mocFolderPath));
		
		// Process each MOC file
		for (const file of mocFiles) {
			const mocNode = await this.processMOCFile(file);
			if (mocNode) {
				nodes.push(mocNode);
			}
		}
		
		// Create links between MOCs
		for (const node of nodes) {
			for (const outlink of node.outlinks) {
				const targetNode = nodes.find(n => n.path === outlink || n.name === outlink);
				if (targetNode) {
					links.push({
						source: node.id,
						target: targetNode.id,
						strength: this.calculateLinkStrength(node, targetNode)
					});
				}
			}
		}
		
		return { nodes, links };
	}

	private async scanEntireVault(): Promise<{ nodes: MOCNode[], links: MOCLink[] }> {
		const nodes: MOCNode[] = [];
		const links: MOCLink[] = [];
		
		// Find files that look like MOCs (contain "MOC" or "Map" in name)
		const allFiles = this.app.vault.getMarkdownFiles();
		const mocFiles = allFiles.filter(file => 
			file.basename.toLowerCase().includes('moc') ||
			file.basename.toLowerCase().includes('map') ||
			file.path.includes('Maps') ||
			file.path.includes('Atlas')
		);
		
		for (const file of mocFiles) {
			const mocNode = await this.processMOCFile(file);
			if (mocNode) {
				nodes.push(mocNode);
			}
		}
		
		// Create links
		for (const node of nodes) {
			for (const outlink of node.outlinks) {
				const targetNode = nodes.find(n => n.name === outlink);
				if (targetNode) {
					links.push({
						source: node.id,
						target: targetNode.id,
						strength: this.calculateLinkStrength(node, targetNode)
					});
				}
			}
		}
		
		return { nodes, links };
	}

	private async processMOCFile(file: TFile): Promise<MOCNode | null> {
		try {
			const content = await this.app.vault.read(file);
			const cache = this.app.metadataCache.getFileCache(file);
			
			// Get inlinks and outlinks
			const inlinks = Object.keys(this.app.metadataCache.resolvedLinks)
				.filter(linkPath => {
					const links = this.app.metadataCache.resolvedLinks[linkPath];
					return links && links[file.path];
				});
			
			const outlinks = cache?.links?.map(link => link.link) || [];
			
			// Determine MOC type and category
			const type = this.determineMOCType(file, content);
			const category = this.determineMOCCategory(file, content);
			
			return {
				id: file.path,
				name: file.basename,
				path: file.path,
				connections: inlinks.length + outlinks.length,
				inlinks,
				outlinks,
				type,
				category
			};
		} catch (error) {
			console.error(`Error processing MOC file ${file.path}:`, error);
			return null;
		}
	}

	private determineMOCType(file: TFile, content: string): 'main' | 'sub' | 'system' {
		const filename = file.basename.toLowerCase();
		const path = file.path.toLowerCase();
		
		// System MOCs
		if (filename.includes('home') || filename.includes('atlas') || 
			filename.includes('index') || path.includes('system')) {
			return 'system';
		}
		
		// Main MOCs (shorter names, in root of Maps folder)
		if (path.split('/').length <= 2 && !filename.includes('sub')) {
			return 'main';
		}
		
		return 'sub';
	}

	private determineMOCCategory(file: TFile, content: string): string {
		const filename = file.basename.toLowerCase();
		
		if (filename.includes('writing') || filename.includes('creative')) return 'creative';
		if (filename.includes('pkm') || filename.includes('knowledge')) return 'knowledge';
		if (filename.includes('people') || filename.includes('personal')) return 'personal';
		if (filename.includes('system') || filename.includes('home')) return 'system';
		
		return 'general';
	}

	private calculateLinkStrength(nodeA: MOCNode, nodeB: MOCNode): number {
		// Simple strength calculation based on mutual connections
		const commonConnections = nodeA.outlinks.filter(link => 
			nodeB.outlinks.includes(link) || nodeB.inlinks.includes(link)
		).length;
		
		return Math.min(commonConnections + 1, 5);
	}

	private renderVisualization() {
		if (!this.svg) return;
		
		// Clear previous visualization
		this.svg.empty();
		
		const width = this.svg.clientWidth || 800;
		const height = 600;
		
		// Create SVG groups
		const g = this.svg.createSvg("g");
		const linksGroup = g.createSvg("g", { cls: "links" });
		const nodesGroup = g.createSvg("g", { cls: "nodes" });
		
		// Create force simulation (simplified version)
		const nodes = [...this.mocData.nodes];
		const links = [...this.mocData.links];
		
		// Position nodes in a circle for now (in real D3, we'd use force simulation)
		const radius = Math.min(width, height) / 3;
		const centerX = width / 2;
		const centerY = height / 2;
		
		nodes.forEach((node, i) => {
			const angle = (i / nodes.length) * 2 * Math.PI;
			node.x = centerX + Math.cos(angle) * radius;
			node.y = centerY + Math.sin(angle) * radius;
		});
		
		// Render links
		links.forEach(link => {
			const sourceNode = nodes.find(n => n.id === link.source);
			const targetNode = nodes.find(n => n.id === link.target);
			
			if (sourceNode && targetNode) {
				const line = linksGroup.createSvg("line", {
					attr: {
						x1: sourceNode.x,
						y1: sourceNode.y,
						x2: targetNode.x,
						y2: targetNode.y,
						stroke: "#7c3aed",
						"stroke-width": link.strength,
						opacity: 0.6
					}
				});
			}
		});
		
		// Render nodes
		nodes.forEach(node => {
			const nodeGroup = nodesGroup.createSvg("g", {
				attr: {
					transform: `translate(${node.x}, ${node.y})`
				}
			});
			
			// Node circle
			const circle = nodeGroup.createSvg("circle", {
				attr: {
					r: Math.min(10 + node.connections * 2, this.settings.maxNodeSize),
					fill: this.getNodeColor(node),
					stroke: "#fff",
					"stroke-width": 2
				},
				cls: "moc-node"
			});
			
			// Node label
			nodeGroup.createSvg("text", {
				attr: {
					"text-anchor": "middle",
					dy: "0.35em",
					fill: "#fff",
					"font-size": "10px",
					"font-weight": "600"
				},
				text: node.name.length > 15 ? node.name.substring(0, 15) + "..." : node.name
			});
			
			// Add click handler
			nodeGroup.addEventListener("click", () => {
				this.openMOC(node.path);
			});
			
			// Add hover tooltip
			this.addTooltip(nodeGroup, node);
		});
	}

	private getNodeColor(node: MOCNode): string {
		const colorSchemes = {
			purple: {
				main: "#7c3aed",
				sub: "#a78bfa", 
				system: "#60a5fa"
			},
			blue: {
				main: "#2563eb",
				sub: "#60a5fa",
				system: "#34d399"
			}
		};
		
		const scheme = colorSchemes[this.settings.colorScheme as keyof typeof colorSchemes] || colorSchemes.purple;
		return scheme[node.type];
	}

	private addTooltip(element: SVGElement, node: MOCNode) {
		element.addEventListener("mouseenter", (e) => {
			const tooltip = document.createElement("div");
			tooltip.className = "moc-tooltip";
			tooltip.innerHTML = `
				<div class="tooltip-title">${node.name}</div>
				<div class="tooltip-content">
					<div>Type: ${node.type}</div>
					<div>Category: ${node.category}</div>
					<div>Connections: ${node.connections}</div>
					<div>Path: ${node.path}</div>
				</div>
			`;
			
			document.body.appendChild(tooltip);
			
			const rect = element.getBoundingClientRect();
			tooltip.style.left = rect.left + "px";
			tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + "px";
		});
		
		element.addEventListener("mouseleave", () => {
			const tooltip = document.querySelector(".moc-tooltip");
			if (tooltip) {
				tooltip.remove();
			}
		});
	}

	private async openMOC(path: string) {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf().openFile(file);
		}
	}

	private updateStats() {
		const totalElement = document.getElementById("total-mocs");
		const connectionsElement = document.getElementById("total-connections");
		const orphansElement = document.getElementById("orphan-mocs");
		const avgElement = document.getElementById("avg-connections");
		
		if (totalElement) totalElement.textContent = this.mocData.nodes.length.toString();
		
		const totalConnections = this.mocData.links.length;
		if (connectionsElement) connectionsElement.textContent = totalConnections.toString();
		
		const orphanedMOCs = this.mocData.nodes.filter(n => n.connections === 0).length;
		if (orphansElement) orphansElement.textContent = orphanedMOCs.toString();
		
		const avgConnections = this.mocData.nodes.length > 0 
			? (this.mocData.nodes.reduce((sum, n) => sum + n.connections, 0) / this.mocData.nodes.length).toFixed(1)
			: "0";
		if (avgElement) avgElement.textContent = avgConnections;
	}

	private filterNodes(filter: string) {
		// Implementation for filtering nodes by type
		// This would hide/show nodes based on the filter
		new Notice(`Filtering by: ${filter}`);
	}

	private searchNodes(query: string) {
		// Implementation for searching nodes
		// This would highlight matching nodes
		new Notice(`Searching for: ${query}`);
	}

	private setupAutoRefresh() {
		// Set up file watcher for auto-refresh
		this.app.vault.on("modify", (file) => {
			if (file.path.startsWith(this.settings.mocFolderPath)) {
				// Debounced refresh
				setTimeout(() => this.refreshData(), 1000);
			}
		});
	}

	async onClose() {
		// Cleanup when view is closed
	}
}

// Settings Tab
class MOCExplorerSettingTab extends PluginSettingTab {
	plugin: MOCExplorerPlugin;

	constructor(app: App, plugin: MOCExplorerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: 'MOC Explorer Settings'});

		new Setting(containerEl)
			.setName('MOC Folder Path')
			.setDesc('Path to folder containing your MOCs')
			.addText(text => text
				.setPlaceholder('Atlas/Maps')
				.setValue(this.plugin.settings.mocFolderPath)
				.onChange(async (value) => {
					this.plugin.settings.mocFolderPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Connection Strength')
			.setDesc('Display connection strength between MOCs')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showConnectionStrength)
				.onChange(async (value) => {
					this.plugin.settings.showConnectionStrength = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Maximum Node Size')
			.setDesc('Maximum size for MOC nodes in the visualization')
			.addSlider(slider => slider
				.setLimits(20, 100, 10)
				.setValue(this.plugin.settings.maxNodeSize)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxNodeSize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Color Scheme')
			.setDesc('Color scheme for the visualization')
			.addDropdown(dropdown => dropdown
				.addOption('purple', 'Purple')
				.addOption('blue', 'Blue')
				.setValue(this.plugin.settings.colorScheme)
				.onChange(async (value) => {
					this.plugin.settings.colorScheme = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto Refresh')
			.setDesc('Automatically refresh when MOCs are modified')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRefresh)
				.onChange(async (value) => {
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Minimum Connections')
			.setDesc('Minimum number of connections to display a MOC')
			.addSlider(slider => slider
				.setLimits(0, 10, 1)
				.setValue(this.plugin.settings.minimumConnections)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.minimumConnections = value;
					await this.plugin.saveSettings();
				}));
	}
}

// Main Plugin Class
export default class MOCExplorerPlugin extends Plugin {
	settings: MOCExplorerSettings;

	async onload() {
		await this.loadSettings();

		// Register the custom view
		this.registerView(
			VIEW_TYPE_MOC_EXPLORER,
			(leaf) => new MOCExplorerView(leaf, this.settings)
		);

		// Add ribbon icon
		this.addRibbonIcon('network', 'Open MOC Explorer', () => {
			this.activateView();
		});

		// Add command
		this.addCommand({
			id: 'open-moc-explorer',
			name: 'Open MOC Explorer',
			callback: () => {
				this.activateView();
			}
		});

		// Add settings tab
		this.addSettingTab(new MOCExplorerSettingTab(this.app, this));

		console.log('MOC Explorer plugin loaded');
	}

	async onunload() {
		console.log('MOC Explorer plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_MOC_EXPLORER);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_MOC_EXPLORER, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}