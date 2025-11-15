const { EmbedBuilder } = require('discord.js');

function formatMenuEmbed(menuData) {
	let title = `🍽️ **${menuData.hall} - ${menuData.meal}**`;
	let desc = "";

	for (const group of menuData.groups) {
		desc += `**${group.name}**\n`;
		for (const item of group.items) {
			desc += `• ${item.name}\n`;
			desc += `  ${item.description}\n\n`;
		}
	}

  	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(desc)
		.setColor(0x0099FF);
}

module.exports = { formatMenuEmbed };
