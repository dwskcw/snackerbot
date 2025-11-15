/* Snackerbot initial release */

/*
 * Load secrets from .env (Discord bot token and guild ID).
 * These should be included in a .env file - see .env.example.
 */
require('dotenv').config();

// discord API specific stuff
const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');

// Slash command definitions
const { commands } = require('./commands.js');

// Menu fetching / caching logic and display names for each dining hall
const { updateMenus, getMenu, getAvailableMeals, DISPLAY_NAMES } = require('./fetch-menus.js');

// Helper for turning a menu JSON object into a Discord embed
const { formatMenuEmbed } = require('./output-formatting.js');

// The Discord client is the main connection to Discord's API.
// We only need Guilds intent because the bot only responds to slash commands.
const client = new Client({
	intents: [GatewayIntentBits.Guilds]
});

// Main event handler for all incoming interactions (slash commands + dropdowns)
client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;
	
	// Handle slash commands (application commands typed by the user)
	if (interaction.isChatInputCommand()) {
		const { commandName } = interaction;
		
		// /snackerbot is the main command that shows menus
		if (commandName === 'snackerbot') {
			// Options that can be provided directly by the user
			const hall = interaction.options.getString('hall');
			const meal = interaction.options.getString('meal');
			const vegetarian = interaction.options.getBoolean('vegetarian') ?? false;
			
			// Case 1: Both hall and meal provided - fetch and show a specific menu
			if (hall && meal) {
				try {
					const menuData = getMenu(hall, meal, vegetarian);
					
					if (!menuData) {
						await interaction.reply({
							content: `❌ ${meal} is not available at ${DISPLAY_NAMES[hall]} today.`,
							flags: [MessageFlags.Ephemeral]
						});
						return;
					}
					
					const embed = formatMenuEmbed(menuData);
					await interaction.reply({ embeds: [embed] });
					
				} catch (error) {
					if (error.message === 'CACHE_STALE') {
						await updateMenus();
						// Retry after refresh
						const menuData = getMenu(hall, meal, vegetarian);
						const embed = formatMenuEmbed(menuData);
						await interaction.reply({ embeds: [embed] });
					} else {
						throw error;
					}
				}
			}
			
			// Case 2: Only hall provided - show meal dropdown
			else if (hall) {
				const availableMeals = getAvailableMeals(hall);
				
				if (availableMeals.length === 0) {
					await interaction.reply({
						content: `❌ No menus available for ${DISPLAY_NAMES[hall]} today.`,
					});
					return;
				}
				
				const mealMenu = new StringSelectMenuBuilder()
					.setCustomId(`meal_${hall}_${vegetarian}`)
					.setPlaceholder('Select a meal')
					.addOptions(
						availableMeals.map(m => ({
							label: m,
							value: m
						}))
					);
				
				const row = new ActionRowBuilder().addComponents(mealMenu);
				
				await interaction.reply({
					content: `Select a meal for ${DISPLAY_NAMES[hall]}:`,
					components: [row],
				});
			}
			
			// Case 3: Nothing provided - show hall dropdown
			else {
				const hallMenu = new StringSelectMenuBuilder()
					.setCustomId(`hall_${vegetarian}`)
					.setPlaceholder('Select a dining hall')
					.addOptions(
						Object.entries(DISPLAY_NAMES).map(([key, name]) => ({
							label: name,
							value: key
						}))
					);
				
				const row = new ActionRowBuilder().addComponents(hallMenu);
				
				await interaction.reply({
					content: 'Select a dining hall:',
					components: [row],
				});
			}
		}
		
		// /refresh-menus forces a refresh of the cached menu data
		else if (commandName === 'refresh-menus') {
			// Defer the reply so the user sees that work is in progress
			await interaction.deferReply({ ephemeral: true });
			await updateMenus();
			await interaction.editReply('✅ Menu cache updated!');
		}
	}
	
	// Handle dropdown selections (StringSelectMenu interactions)
	else if (interaction.isStringSelectMenu()) {
		// customId encodes what kind of dropdown this is and any extra parameters
		const [action, ...params] = interaction.customId.split('_');
		const selectedValue = interaction.values[0];
		
		// When the user picks a hall, show a second dropdown listing available meals
		if (action === 'hall') {
			const vegetarian = params[0] === 'true';
			const hall = selectedValue;
			const availableMeals = getAvailableMeals(hall);
		
			if (availableMeals.length === 0) {
				await interaction.update({
					content: `❌ No menus available for ${DISPLAY_NAMES[hall]} today.`,
					components: []
				});
				return;
			}
		
			const mealMenu = new StringSelectMenuBuilder()
				.setCustomId(`meal_${hall}_${vegetarian}`)
				.setPlaceholder('Select a meal')
				.addOptions(
					availableMeals.map(m => ({
						label: m,
						value: m
					}))
				);
		
			const row = new ActionRowBuilder().addComponents(mealMenu);
		
			await interaction.update({
				content: `Select a meal for ${DISPLAY_NAMES[hall]}:`,
				components: [row]
			});
		}
	
		
			try {
				const menuData = getMenu(hall, meal, vegetarian);
			
				if (!menuData) {
					await interaction.update({
						content: `❌ ${meal} is not available at ${DISPLAY_NAMES[hall]} today.`,
						components: []
					});
					return;
				}
			
				const embed = formatMenuEmbed(menuData);
				await interaction.update({
					content: null,
					embeds: [embed],
					components: []
				});
			
			} catch (error) {
				if (error.message === 'CACHE_STALE') {
					await updateMenus();
					const menuData = getMenu(hall, meal, vegetarian);
					const embed = formatMenuEmbed(menuData);
					await interaction.update({
						content: null,
						embeds: [embed],
						components: []
					});
				} else {
					throw error;
				}
			}
		}
	}
});

client.once('clientReady', async () => {
	console.log(`Successfully logged in as ${client.user.tag}.`);

	// Register slash commands
  	const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  	try {
    		console.log('Registering slash commands...');
    		await rest.put(
      			Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      			{ body: commands.map(cmd => cmd.toJSON()) }
    		);
    		console.log('Successfully registered slash commands!');
  	} catch (error) {
    		console.error('Failed to register commands:', error);
  	}

  	// Fetch initial menu data
  	await updateMenus();
});

client.login(process.env.DISCORD_TOKEN);
