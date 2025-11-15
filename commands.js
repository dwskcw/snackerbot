const { SlashCommandBuilder } = require('discord.js');

const diningHalls = [
	{ name: 'BARH Dining Hall', value: 'barh' },
	{ name: 'The Commons Dining Hall', value: 'commons' },
	{ name: 'Blitman Dining Hall', value: 'blitman' },
	{ name: 'Russell Sage Dining Hall', value: 'sage' }
];

const meals = [
	{ name: 'Breakfast', value: 'Breakfast' },
	{ name: 'Lunch', value: 'Lunch' },
	{ name: 'Dinner', value: 'Dinner' }
];

const snackerbotCommand = new SlashCommandBuilder()
	.setName('snackerbot')
	.setDescription('Get dining hall menus')
	.addStringOption(option =>
		option
			.setName('hall')
      			.setDescription('Pick a dining hall menu')
      			.addChoices(...diningHalls)
      			.setRequired(false)
  	)
  	.addStringOption(option =>
    		option
      			.setName('meal')
      			.setDescription('Pick which meal to show')
      			.addChoices(...meals)
      			.setRequired(false)
  	)
  	.addBooleanOption(option =>
    		option
      			.setName('vegetarian')
      			.setDescription('Show only vegetarian items?')
      			.setRequired(false)
  	);

const updateCommand = new SlashCommandBuilder()
	.setName('refresh-menus')
	.setDescription('Manually refresh the menu cache');

module.exports = {
  	commands: [snackerbotCommand, updateCommand]
}
