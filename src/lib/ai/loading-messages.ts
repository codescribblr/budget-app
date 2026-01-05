// Rotating loading messages for AI queries
// These rotate every 3 seconds to keep users entertained while waiting

export const AI_LOADING_MESSAGES = [
  "Searching the well-worn paths of the budget train...",
  "Counting pennies like a digital Scrooge McDuck...",
  "Consulting with the financial spirits of budgets past...",
  "Following the money trail through the digital wilderness...",
  "Asking the oracle of overdrafts for guidance...",
  "Diving deep into the transaction abyss...",
  "Summoning the ancient wisdom of spreadsheets...",
  "Chasing down those elusive budget insights...",
  "Interrogating your spending habits (they're pleading the fifth)...",
  "Decoding the cryptic language of bank statements...",
  "Rummaging through the financial filing cabinet...",
  "Consulting the crystal ball of cash flow...",
  "Following the breadcrumbs of your budget...",
  "Playing detective with your debit card...",
  "Channeling the spirit of Benjamin Franklin...",
  "Mining for gold in your transaction history...",
  "Asking your bank account politely for answers...",
  "Navigating the treacherous waters of your expenses...",
  "Summoning the budget genie from the lamp...",
  "Playing hide and seek with your savings...",
  "Consulting the great book of financial wisdom...",
  "Following the yellow brick road to budget insights...",
  "Channeling your inner accountant (they're very excited)...",
  "Deciphering the ancient scrolls of receipts...",
  "Asking the magic 8-ball about your spending...",
] as const;

/**
 * Get a random loading message
 */
export function getRandomLoadingMessage(): string {
  return AI_LOADING_MESSAGES[
    Math.floor(Math.random() * AI_LOADING_MESSAGES.length)
  ];
}


