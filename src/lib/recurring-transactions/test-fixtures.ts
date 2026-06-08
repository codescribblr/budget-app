/**
 * Test fixtures for recurring transaction detection
 * 
 * This file contains test data exported from the recurring analysis tool.
 * To update these fixtures:
 * 1. Run the analysis tool at /test/recurring-analysis
 * 2. Export the results
 * 3. Copy the exported JSON data here
 */

export interface TestTransaction {
  id: number;
  date: string;
  total_amount: number;
  transaction_type: 'income' | 'expense';
  merchant_group_id: number | null;
  account_id: number | null;
  credit_card_id: number | null;
  merchant_groups?: {
    display_name: string;
  };
}

export interface TestAnalysisResult {
  merchantGroupId: number;
  merchantName: string;
  isRecurring: boolean;
  frequency: string | null;
  confidence: string;
  reason: string;
  shouldDetect: boolean;
}

export interface TestMerchantSummary {
  merchantGroupId: number;
  merchantName: string;
  transactionCount: number;
  firstDate: string;
  lastDate: string;
  daysSinceLastTransaction?: number;
  dateSpanDays: number;
  avgInterval: number;
  minInterval: number;
  maxInterval: number;
  minAmount: number;
  maxAmount: number;
  avgAmount: number;
  amountVariance: number;
  transactionType: 'income' | 'expense';
  sampleDates: string[];
  sampleAmounts: number[];
}

export interface TestFixture {
  metadata: {
    exportedAt: string;
    transactionCount: number;
    merchantCount: number;
    analysisCount: number;
  };
  transactions: TestTransaction[];
  analysis: TestAnalysisResult[];
  merchantSummaries: TestMerchantSummary[];
}

// Placeholder - will be replaced with actual exported data
// To load your exported data:
// 1. Open the exported JSON file
// 2. Copy the entire JSON object
// 3. Paste it here, replacing this placeholder object
// 4. Make sure it matches the TestFixture interface above
export const testFixture: TestFixture = {
    "metadata": {
      "exportedAt": "2026-01-31T19:57:45.935Z",
      "transactionCount": 2800,
      "merchantCount": 124,
      "analysisCount": 50
    },
    "transactions": [
      {
        "id": 39798,
        "date": "2023-12-08",
        "total_amount": 1986.95,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37815,
        "date": "2023-12-11",
        "total_amount": 9000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 39054,
        "date": "2023-12-11",
        "total_amount": 2000,
        "transaction_type": "income",
        "merchant_group_id": 7424,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 39504,
        "date": "2023-12-11",
        "total_amount": 12000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 39505,
        "date": "2023-12-11",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39525,
        "date": "2023-12-11",
        "total_amount": 965.15,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39795,
        "date": "2023-12-11",
        "total_amount": 12000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39796,
        "date": "2023-12-11",
        "total_amount": 9000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39797,
        "date": "2023-12-11",
        "total_amount": 2000,
        "transaction_type": "expense",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39052,
        "date": "2023-12-13",
        "total_amount": 1.5,
        "transaction_type": "expense",
        "merchant_group_id": 7572,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville Count Echeck Jonathan Wadsworth"
        }
      },
      {
        "id": 39053,
        "date": "2023-12-13",
        "total_amount": 8505.75,
        "transaction_type": "expense",
        "merchant_group_id": 7572,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville Count Echeck Jonathan Wadsworth"
        }
      },
      {
        "id": 39530,
        "date": "2023-12-13",
        "total_amount": 2508.4,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39794,
        "date": "2023-12-13",
        "total_amount": 111.41,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39503,
        "date": "2023-12-14",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38804,
        "date": "2023-12-15",
        "total_amount": 3614.15,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39502,
        "date": "2023-12-15",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39793,
        "date": "2023-12-15",
        "total_amount": 0.09,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 37507,
        "date": "2023-12-17",
        "total_amount": 15.99,
        "transaction_type": "income",
        "merchant_group_id": 7340,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zoom"
        }
      },
      {
        "id": 38803,
        "date": "2023-12-18",
        "total_amount": 1226.67,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39501,
        "date": "2023-12-18",
        "total_amount": 901.88,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39791,
        "date": "2023-12-18",
        "total_amount": 2220.1,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39792,
        "date": "2023-12-18",
        "total_amount": 11778.48,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39527,
        "date": "2023-12-19",
        "total_amount": 3513.34,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39790,
        "date": "2023-12-19",
        "total_amount": 681.81,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37504,
        "date": "2023-12-20",
        "total_amount": 44.64,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37505,
        "date": "2023-12-20",
        "total_amount": 5.27,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37506,
        "date": "2023-12-20",
        "total_amount": 12.4,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38802,
        "date": "2023-12-20",
        "total_amount": 1783.88,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39789,
        "date": "2023-12-20",
        "total_amount": 1500,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 38393,
        "date": "2023-12-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39050,
        "date": "2023-12-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39051,
        "date": "2023-12-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39499,
        "date": "2023-12-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39500,
        "date": "2023-12-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39820,
        "date": "2023-12-22",
        "total_amount": 10000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39113,
        "date": "2023-12-26",
        "total_amount": 3000,
        "transaction_type": "expense",
        "merchant_group_id": 7396,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nfs7bjw Complete Ad..."
        }
      },
      {
        "id": 39498,
        "date": "2023-12-26",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7398,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39788,
        "date": "2023-12-26",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 37503,
        "date": "2023-12-27",
        "total_amount": 52.58,
        "transaction_type": "income",
        "merchant_group_id": 7530,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Paygamemoney Estonia"
        }
      },
      {
        "id": 39532,
        "date": "2023-12-28",
        "total_amount": 2197.03,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39787,
        "date": "2023-12-28",
        "total_amount": 1773,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38801,
        "date": "2023-12-29",
        "total_amount": 3862.26,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39049,
        "date": "2023-12-29",
        "total_amount": 0.41,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39112,
        "date": "2023-12-29",
        "total_amount": 0.39,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39785,
        "date": "2023-12-29",
        "total_amount": 5000,
        "transaction_type": "income",
        "merchant_group_id": 7588,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Instant From Wealthfront On 12 29 Ref 202312291210..."
        }
      },
      {
        "id": 39786,
        "date": "2023-12-29",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7375,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0v7bklny To Signify Business Essent..."
        }
      },
      {
        "id": 37501,
        "date": "2023-12-30",
        "total_amount": 17.49,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37502,
        "date": "2023-12-30",
        "total_amount": 3.23,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38392,
        "date": "2023-12-30",
        "total_amount": 10.35,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37813,
        "date": "2024-01-02",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38250,
        "date": "2024-01-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38502,
        "date": "2024-01-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39111,
        "date": "2024-01-02",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39496,
        "date": "2024-01-02",
        "total_amount": 609.41,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39497,
        "date": "2024-01-02",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39782,
        "date": "2024-01-02",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39783,
        "date": "2024-01-02",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39784,
        "date": "2024-01-02",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37500,
        "date": "2024-01-03",
        "total_amount": 151.6,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39777,
        "date": "2024-01-03",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39779,
        "date": "2024-01-03",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39780,
        "date": "2024-01-03",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39781,
        "date": "2024-01-03",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39894,
        "date": "2024-01-03",
        "total_amount": 4000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39110,
        "date": "2024-01-04",
        "total_amount": 385.54,
        "transaction_type": "expense",
        "merchant_group_id": 7375,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0v7bklny To Signify Business Essent..."
        }
      },
      {
        "id": 39775,
        "date": "2024-01-04",
        "total_amount": 151.6,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39776,
        "date": "2024-01-04",
        "total_amount": 5991.1,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39109,
        "date": "2024-01-05",
        "total_amount": 144.86,
        "transaction_type": "expense",
        "merchant_group_id": 7571,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 7122579 Jonathan Wadsworth"
        }
      },
      {
        "id": 39773,
        "date": "2024-01-05",
        "total_amount": 2104.12,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39774,
        "date": "2024-01-05",
        "total_amount": 3007.84,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 38391,
        "date": "2024-01-06",
        "total_amount": 21.19,
        "transaction_type": "income",
        "merchant_group_id": 7509,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Roku"
        }
      },
      {
        "id": 38390,
        "date": "2024-01-08",
        "total_amount": 71.53,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39495,
        "date": "2024-01-08",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39770,
        "date": "2024-01-08",
        "total_amount": 225,
        "transaction_type": "income",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 39771,
        "date": "2024-01-08",
        "total_amount": 641,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39772,
        "date": "2024-01-08",
        "total_amount": 9.77,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38389,
        "date": "2024-01-09",
        "total_amount": 90,
        "transaction_type": "income",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 39494,
        "date": "2024-01-09",
        "total_amount": 71.53,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39767,
        "date": "2024-01-09",
        "total_amount": 815.68,
        "transaction_type": "income",
        "merchant_group_id": 7541,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wells Fargo Rewards"
        }
      },
      {
        "id": 39768,
        "date": "2024-01-09",
        "total_amount": 1007.11,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39769,
        "date": "2024-01-09",
        "total_amount": 1932,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39861,
        "date": "2024-01-09",
        "total_amount": 986.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39766,
        "date": "2024-01-10",
        "total_amount": 110.48,
        "transaction_type": "income",
        "merchant_group_id": 7324,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Rewards"
        }
      },
      {
        "id": 38388,
        "date": "2024-01-11",
        "total_amount": 275.97,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38800,
        "date": "2024-01-12",
        "total_amount": 3879.79,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39531,
        "date": "2024-01-12",
        "total_amount": 1791.15,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38868,
        "date": "2024-01-13",
        "total_amount": 4.69,
        "transaction_type": "income",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 39764,
        "date": "2024-01-16",
        "total_amount": 1182,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39765,
        "date": "2024-01-16",
        "total_amount": 646.56,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37499,
        "date": "2024-01-17",
        "total_amount": 15.99,
        "transaction_type": "income",
        "merchant_group_id": 7340,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zoom"
        }
      },
      {
        "id": 39493,
        "date": "2024-01-17",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39524,
        "date": "2024-01-17",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39762,
        "date": "2024-01-17",
        "total_amount": 6000,
        "transaction_type": "expense",
        "merchant_group_id": 7399,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0rlwbvjk To Signify Business Essent..."
        }
      },
      {
        "id": 39763,
        "date": "2024-01-17",
        "total_amount": 0.1,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 37497,
        "date": "2024-01-18",
        "total_amount": 21.16,
        "transaction_type": "income",
        "merchant_group_id": 7530,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Paygamemoney Estonia"
        }
      },
      {
        "id": 37498,
        "date": "2024-01-18",
        "total_amount": 96.02,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39761,
        "date": "2024-01-18",
        "total_amount": 113.88,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38387,
        "date": "2024-01-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39047,
        "date": "2024-01-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39048,
        "date": "2024-01-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39477,
        "date": "2024-01-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39478,
        "date": "2024-01-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39492,
        "date": "2024-01-22",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39481,
        "date": "2024-01-23",
        "total_amount": 974.85,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39759,
        "date": "2024-01-23",
        "total_amount": 3546,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39760,
        "date": "2024-01-23",
        "total_amount": 5,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38386,
        "date": "2024-01-25",
        "total_amount": 15.89,
        "transaction_type": "income",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 39758,
        "date": "2024-01-25",
        "total_amount": 30000,
        "transaction_type": "income",
        "merchant_group_id": 7567,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Edeposit In Branch 01 25 24 03 43 57 Pm 2616 Wade..."
        }
      },
      {
        "id": 38798,
        "date": "2024-01-26",
        "total_amount": 3879.79,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38799,
        "date": "2024-01-26",
        "total_amount": 591,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39108,
        "date": "2024-01-29",
        "total_amount": 19.54,
        "transaction_type": "expense",
        "merchant_group_id": 7393,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0t3379m3 To Signify Business Essent..."
        }
      },
      {
        "id": 39757,
        "date": "2024-01-29",
        "total_amount": 159,
        "transaction_type": "expense",
        "merchant_group_id": 7394,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0r8pv96d To Signify Business Essent..."
        }
      },
      {
        "id": 38384,
        "date": "2024-01-30",
        "total_amount": 48.4,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38385,
        "date": "2024-01-30",
        "total_amount": 37.38,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39476,
        "date": "2024-01-30",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39480,
        "date": "2024-01-30",
        "total_amount": 1277.49,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38818,
        "date": "2024-01-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39046,
        "date": "2024-01-31",
        "total_amount": 0.03,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39107,
        "date": "2024-01-31",
        "total_amount": 0.04,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39755,
        "date": "2024-01-31",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39756,
        "date": "2024-01-31",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37812,
        "date": "2024-02-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38249,
        "date": "2024-02-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38451,
        "date": "2024-02-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39106,
        "date": "2024-02-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39475,
        "date": "2024-02-01",
        "total_amount": 609.41,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39754,
        "date": "2024-02-01",
        "total_amount": 6000,
        "transaction_type": "expense",
        "merchant_group_id": 7542,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Check 417"
        }
      },
      {
        "id": 39485,
        "date": "2024-02-02",
        "total_amount": 1552,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39749,
        "date": "2024-02-02",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39750,
        "date": "2024-02-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39751,
        "date": "2024-02-02",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39752,
        "date": "2024-02-02",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39753,
        "date": "2024-02-02",
        "total_amount": 2000,
        "transaction_type": "expense",
        "merchant_group_id": 7542,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Check 417"
        }
      },
      {
        "id": 39778,
        "date": "2024-02-02",
        "total_amount": 7.12,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37822,
        "date": "2024-02-05",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39105,
        "date": "2024-02-05",
        "total_amount": 144.86,
        "transaction_type": "expense",
        "merchant_group_id": 7573,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 6492319 Jonathan Wadsworth"
        }
      },
      {
        "id": 39474,
        "date": "2024-02-05",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39748,
        "date": "2024-02-05",
        "total_amount": 3007.84,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37496,
        "date": "2024-02-07",
        "total_amount": 137.86,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37811,
        "date": "2024-02-07",
        "total_amount": 6000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 38383,
        "date": "2024-02-07",
        "total_amount": 507.63,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39473,
        "date": "2024-02-07",
        "total_amount": 12000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 39483,
        "date": "2024-02-07",
        "total_amount": 2036.27,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39746,
        "date": "2024-02-07",
        "total_amount": 6000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39747,
        "date": "2024-02-07",
        "total_amount": 12000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39472,
        "date": "2024-02-08",
        "total_amount": 507.63,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39743,
        "date": "2024-02-08",
        "total_amount": 137.86,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39744,
        "date": "2024-02-08",
        "total_amount": 13883.01,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39745,
        "date": "2024-02-08",
        "total_amount": 2500,
        "transaction_type": "expense",
        "merchant_group_id": 7542,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Check 417"
        }
      },
      {
        "id": 38797,
        "date": "2024-02-09",
        "total_amount": 3940.32,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38382,
        "date": "2024-02-11",
        "total_amount": 282.96,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38796,
        "date": "2024-02-12",
        "total_amount": 689.99,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39479,
        "date": "2024-02-12",
        "total_amount": 405.22,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39741,
        "date": "2024-02-12",
        "total_amount": 2500,
        "transaction_type": "expense",
        "merchant_group_id": 7525,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposited Or Cashed Check 375"
        }
      },
      {
        "id": 39742,
        "date": "2024-02-12",
        "total_amount": 10000,
        "transaction_type": "expense",
        "merchant_group_id": 7542,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Check 417"
        }
      },
      {
        "id": 39490,
        "date": "2024-02-14",
        "total_amount": 2678.4,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39740,
        "date": "2024-02-14",
        "total_amount": 202.37,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39739,
        "date": "2024-02-15",
        "total_amount": 0.21,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39471,
        "date": "2024-02-15",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39878,
        "date": "2024-02-16",
        "total_amount": 600,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39879,
        "date": "2024-02-16",
        "total_amount": 700,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38381,
        "date": "2024-02-17",
        "total_amount": 120.66,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39733,
        "date": "2024-02-20",
        "total_amount": 591,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39736,
        "date": "2024-02-20",
        "total_amount": 591,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39737,
        "date": "2024-02-20",
        "total_amount": 681.33,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39738,
        "date": "2024-02-20",
        "total_amount": 40,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38380,
        "date": "2024-02-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39482,
        "date": "2024-02-21",
        "total_amount": 1033.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39732,
        "date": "2024-02-21",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38795,
        "date": "2024-02-22",
        "total_amount": 600,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39044,
        "date": "2024-02-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39045,
        "date": "2024-02-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39469,
        "date": "2024-02-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39470,
        "date": "2024-02-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38794,
        "date": "2024-02-23",
        "total_amount": 3879.79,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39468,
        "date": "2024-02-23",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 39731,
        "date": "2024-02-23",
        "total_amount": 5000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39877,
        "date": "2024-02-23",
        "total_amount": 4387.5,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39729,
        "date": "2024-02-26",
        "total_amount": 30000,
        "transaction_type": "income",
        "merchant_group_id": 7558,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Edeposit In Branch 02 26 24 01 59 34 Pm 3217 N Ple..."
        }
      },
      {
        "id": 39730,
        "date": "2024-02-26",
        "total_amount": 13132.5,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39728,
        "date": "2024-02-27",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 40008,
        "date": "2024-02-27",
        "total_amount": 1199.81,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39869,
        "date": "2024-02-28",
        "total_amount": 1000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39104,
        "date": "2024-02-29",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 37808,
        "date": "2024-03-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38248,
        "date": "2024-03-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38449,
        "date": "2024-03-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39103,
        "date": "2024-03-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39467,
        "date": "2024-03-01",
        "total_amount": 609.41,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39726,
        "date": "2024-03-01",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39727,
        "date": "2024-03-01",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39722,
        "date": "2024-03-04",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39723,
        "date": "2024-03-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39724,
        "date": "2024-03-04",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39725,
        "date": "2024-03-04",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37823,
        "date": "2024-03-05",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38379,
        "date": "2024-03-05",
        "total_amount": 44,
        "transaction_type": "income",
        "merchant_group_id": 7382,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Top Turf Lawn & Pest"
        }
      },
      {
        "id": 38793,
        "date": "2024-03-05",
        "total_amount": 4456.28,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39101,
        "date": "2024-03-05",
        "total_amount": 998.84,
        "transaction_type": "expense",
        "merchant_group_id": 7430,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0thyqmd3 To Signify Business Essent..."
        }
      },
      {
        "id": 39102,
        "date": "2024-03-05",
        "total_amount": 149.19,
        "transaction_type": "expense",
        "merchant_group_id": 7587,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 5485819 Jonathan Wadsworth"
        }
      },
      {
        "id": 39491,
        "date": "2024-03-05",
        "total_amount": 1126.57,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39720,
        "date": "2024-03-05",
        "total_amount": 15000,
        "transaction_type": "expense",
        "merchant_group_id": 7430,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0thyqmd3 To Signify Business Essent..."
        }
      },
      {
        "id": 39721,
        "date": "2024-03-05",
        "total_amount": 3007.84,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39719,
        "date": "2024-03-06",
        "total_amount": 3470.67,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 39876,
        "date": "2024-03-06",
        "total_amount": 12500,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38378,
        "date": "2024-03-07",
        "total_amount": 487.61,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39466,
        "date": "2024-03-07",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39718,
        "date": "2024-03-07",
        "total_amount": 560.38,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38792,
        "date": "2024-03-08",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39465,
        "date": "2024-03-08",
        "total_amount": 487.61,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38377,
        "date": "2024-03-11",
        "total_amount": 399.4,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38791,
        "date": "2024-03-12",
        "total_amount": 50,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39484,
        "date": "2024-03-12",
        "total_amount": 1013.65,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37492,
        "date": "2024-03-13",
        "total_amount": 95.38,
        "transaction_type": "income",
        "merchant_group_id": 7290,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Wyze Labs"
        }
      },
      {
        "id": 39464,
        "date": "2024-03-13",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39489,
        "date": "2024-03-13",
        "total_amount": 2678.4,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39717,
        "date": "2024-03-13",
        "total_amount": 1620,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 38790,
        "date": "2024-03-14",
        "total_amount": 540.03,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39716,
        "date": "2024-03-15",
        "total_amount": 0.21,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39875,
        "date": "2024-03-15",
        "total_amount": 2400,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39463,
        "date": "2024-03-18",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39486,
        "date": "2024-03-18",
        "total_amount": 1690.71,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39715,
        "date": "2024-03-18",
        "total_amount": 173.5,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39714,
        "date": "2024-03-20",
        "total_amount": 3300,
        "transaction_type": "expense",
        "merchant_group_id": 7542,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Check 417"
        }
      },
      {
        "id": 38376,
        "date": "2024-03-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38789,
        "date": "2024-03-22",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39042,
        "date": "2024-03-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39043,
        "date": "2024-03-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39461,
        "date": "2024-03-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39462,
        "date": "2024-03-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39460,
        "date": "2024-03-25",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39712,
        "date": "2024-03-25",
        "total_amount": 664.97,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39713,
        "date": "2024-03-25",
        "total_amount": 673.28,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39487,
        "date": "2024-03-26",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39488,
        "date": "2024-03-26",
        "total_amount": 1951.64,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39711,
        "date": "2024-03-27",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 39014,
        "date": "2024-03-28",
        "total_amount": 39.08,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39100,
        "date": "2024-03-29",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39459,
        "date": "2024-03-29",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37807,
        "date": "2024-04-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38438,
        "date": "2024-04-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38828,
        "date": "2024-04-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39004,
        "date": "2024-04-01",
        "total_amount": 78.15,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39010,
        "date": "2024-04-01",
        "total_amount": 6.81,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39012,
        "date": "2024-04-01",
        "total_amount": 6.51,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39099,
        "date": "2024-04-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39458,
        "date": "2024-04-01",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39709,
        "date": "2024-04-01",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39710,
        "date": "2024-04-01",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39895,
        "date": "2024-04-01",
        "total_amount": 154.75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39705,
        "date": "2024-04-02",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39706,
        "date": "2024-04-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39707,
        "date": "2024-04-02",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39708,
        "date": "2024-04-02",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39857,
        "date": "2024-04-02",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39892,
        "date": "2024-04-02",
        "total_amount": 0.56,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37794,
        "date": "2024-04-03",
        "total_amount": 57.66,
        "transaction_type": "income",
        "merchant_group_id": 7395,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wave Sv9t Jonathan Wadsworth"
        }
      },
      {
        "id": 37800,
        "date": "2024-04-03",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38375,
        "date": "2024-04-03",
        "total_amount": 18.19,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37473,
        "date": "2024-04-04",
        "total_amount": 95.38,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37474,
        "date": "2024-04-04",
        "total_amount": 601.24,
        "transaction_type": "income",
        "merchant_group_id": 7512,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Tires.com"
        }
      },
      {
        "id": 39457,
        "date": "2024-04-04",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38374,
        "date": "2024-04-05",
        "total_amount": 10.4,
        "transaction_type": "income",
        "merchant_group_id": 7289,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Usps"
        }
      },
      {
        "id": 38788,
        "date": "2024-04-05",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39098,
        "date": "2024-04-05",
        "total_amount": 127.88,
        "transaction_type": "expense",
        "merchant_group_id": 7592,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 5055507 Jonathan Wadsworth"
        }
      },
      {
        "id": 39456,
        "date": "2024-04-05",
        "total_amount": 8000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 39700,
        "date": "2024-04-05",
        "total_amount": 8000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39701,
        "date": "2024-04-05",
        "total_amount": 95.38,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39702,
        "date": "2024-04-05",
        "total_amount": 641.08,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39703,
        "date": "2024-04-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39704,
        "date": "2024-04-05",
        "total_amount": 20,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39734,
        "date": "2024-04-05",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39735,
        "date": "2024-04-05",
        "total_amount": 560,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39874,
        "date": "2024-04-05",
        "total_amount": 7525,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38373,
        "date": "2024-04-08",
        "total_amount": 90,
        "transaction_type": "income",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 39699,
        "date": "2024-04-08",
        "total_amount": 200,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 39868,
        "date": "2024-04-08",
        "total_amount": 1296.89,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38981,
        "date": "2024-04-09",
        "total_amount": 9.77,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39097,
        "date": "2024-04-09",
        "total_amount": 9.77,
        "transaction_type": "expense",
        "merchant_group_id": 7517,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0s6k63d7 To Signify Business Essent..."
        }
      },
      {
        "id": 39455,
        "date": "2024-04-09",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39698,
        "date": "2024-04-09",
        "total_amount": 10101.64,
        "transaction_type": "expense",
        "merchant_group_id": 7517,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0s6k63d7 To Signify Business Essent..."
        }
      },
      {
        "id": 38372,
        "date": "2024-04-10",
        "total_amount": 457.58,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38980,
        "date": "2024-04-10",
        "total_amount": 9.77,
        "transaction_type": "expense",
        "merchant_group_id": 7406,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Last Statement Bal From Acct Ending 3780"
        }
      },
      {
        "id": 38368,
        "date": "2024-04-11",
        "total_amount": 277.54,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39454,
        "date": "2024-04-11",
        "total_amount": 457.58,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39439,
        "date": "2024-04-12",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39443,
        "date": "2024-04-12",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39451,
        "date": "2024-04-12",
        "total_amount": 2197,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39697,
        "date": "2024-04-12",
        "total_amount": 127.1,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 38955,
        "date": "2024-04-15",
        "total_amount": 0.12,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39438,
        "date": "2024-04-15",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37793,
        "date": "2024-04-16",
        "total_amount": 334.39,
        "transaction_type": "income",
        "merchant_group_id": 7395,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wave Sv9t Jonathan Wadsworth"
        }
      },
      {
        "id": 39450,
        "date": "2024-04-16",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38367,
        "date": "2024-04-17",
        "total_amount": 54.7,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39696,
        "date": "2024-04-17",
        "total_amount": 151.45,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38787,
        "date": "2024-04-19",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39873,
        "date": "2024-04-19",
        "total_amount": 1600,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38366,
        "date": "2024-04-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38786,
        "date": "2024-04-22",
        "total_amount": 1252.61,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39040,
        "date": "2024-04-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39041,
        "date": "2024-04-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39435,
        "date": "2024-04-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39436,
        "date": "2024-04-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39437,
        "date": "2024-04-22",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39446,
        "date": "2024-04-23",
        "total_amount": 921.27,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39448,
        "date": "2024-04-24",
        "total_amount": 1613.11,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39695,
        "date": "2024-04-24",
        "total_amount": 5108,
        "transaction_type": "income",
        "merchant_group_id": 7568,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sc State Treasur Tax Refund R440 Jonathan Wadswort..."
        }
      },
      {
        "id": 39434,
        "date": "2024-04-25",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39433,
        "date": "2024-04-26",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39432,
        "date": "2024-04-29",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37791,
        "date": "2024-04-30",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 38979,
        "date": "2024-04-30",
        "total_amount": 285.86,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39039,
        "date": "2024-04-30",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39095,
        "date": "2024-04-30",
        "total_amount": 285.86,
        "transaction_type": "expense",
        "merchant_group_id": 7517,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0s6k63d7 To Signify Business Essent..."
        }
      },
      {
        "id": 39096,
        "date": "2024-04-30",
        "total_amount": 0.02,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39431,
        "date": "2024-04-30",
        "total_amount": 8000,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 39440,
        "date": "2024-04-30",
        "total_amount": 1196.01,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39691,
        "date": "2024-04-30",
        "total_amount": 8000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39692,
        "date": "2024-04-30",
        "total_amount": 5000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39693,
        "date": "2024-04-30",
        "total_amount": 17307.82,
        "transaction_type": "expense",
        "merchant_group_id": 7399,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0rlwbvjk To Signify Business Essent..."
        }
      },
      {
        "id": 39694,
        "date": "2024-04-30",
        "total_amount": 7,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37790,
        "date": "2024-05-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38247,
        "date": "2024-05-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38837,
        "date": "2024-05-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39002,
        "date": "2024-05-01",
        "total_amount": 51.99,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39003,
        "date": "2024-05-01",
        "total_amount": 78.54,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39009,
        "date": "2024-05-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39011,
        "date": "2024-05-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39094,
        "date": "2024-05-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39430,
        "date": "2024-05-01",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39688,
        "date": "2024-05-01",
        "total_amount": 7939,
        "transaction_type": "income",
        "merchant_group_id": 7520,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Irs Treas 310 Tax Ref Xxxxxxxxxx00918 Wadsworth Jo..."
        }
      },
      {
        "id": 39689,
        "date": "2024-05-01",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39690,
        "date": "2024-05-01",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37801,
        "date": "2024-05-02",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39683,
        "date": "2024-05-02",
        "total_amount": 565.08,
        "transaction_type": "income",
        "merchant_group_id": 7541,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wells Fargo Rewards"
        }
      },
      {
        "id": 39684,
        "date": "2024-05-02",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39685,
        "date": "2024-05-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39686,
        "date": "2024-05-02",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39687,
        "date": "2024-05-02",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39864,
        "date": "2024-05-02",
        "total_amount": 2129.15,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39891,
        "date": "2024-05-02",
        "total_amount": 0.56,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39906,
        "date": "2024-05-02",
        "total_amount": 0.96,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": undefined
      },
      {
        "id": 37786,
        "date": "2024-05-03",
        "total_amount": 2500,
        "transaction_type": "expense",
        "merchant_group_id": 7424,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Complete Advantage Rm Xxxx..."
        }
      },
      {
        "id": 38785,
        "date": "2024-05-03",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39429,
        "date": "2024-05-03",
        "total_amount": 1000,
        "transaction_type": "income",
        "merchant_group_id": 7376,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nw6wx26 Complete Ad..."
        }
      },
      {
        "id": 39679,
        "date": "2024-05-03",
        "total_amount": 355.18,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39680,
        "date": "2024-05-03",
        "total_amount": 2500,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39681,
        "date": "2024-05-03",
        "total_amount": 1000,
        "transaction_type": "expense",
        "merchant_group_id": 7579,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Jonathan R Wadsworth Ref Ib0n3wqm4l Bu..."
        }
      },
      {
        "id": 39682,
        "date": "2024-05-03",
        "total_amount": 920,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39093,
        "date": "2024-05-06",
        "total_amount": 140,
        "transaction_type": "expense",
        "merchant_group_id": 7593,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 4519021 Jonathan Wadsworth"
        }
      },
      {
        "id": 39678,
        "date": "2024-05-06",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39449,
        "date": "2024-05-07",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39677,
        "date": "2024-05-07",
        "total_amount": 459.17,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 39428,
        "date": "2024-05-08",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38312,
        "date": "2024-05-09",
        "total_amount": 22.85,
        "transaction_type": "income",
        "merchant_group_id": 7400,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Usps Po Greenville"
        }
      },
      {
        "id": 38365,
        "date": "2024-05-09",
        "total_amount": 13.04,
        "transaction_type": "income",
        "merchant_group_id": 7370,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Once Upon A Child"
        }
      },
      {
        "id": 39441,
        "date": "2024-05-10",
        "total_amount": 22.85,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38311,
        "date": "2024-05-11",
        "total_amount": 218.6,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39427,
        "date": "2024-05-13",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39452,
        "date": "2024-05-14",
        "total_amount": 1890.41,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 40007,
        "date": "2024-05-14",
        "total_amount": 1218.18,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38314,
        "date": "2024-05-15",
        "total_amount": 39.08,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39674,
        "date": "2024-05-15",
        "total_amount": 144.03,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39675,
        "date": "2024-05-15",
        "total_amount": 657.69,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39676,
        "date": "2024-05-15",
        "total_amount": 0.11,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 38784,
        "date": "2024-05-17",
        "total_amount": 4051.47,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37472,
        "date": "2024-05-19",
        "total_amount": 601.24,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38310,
        "date": "2024-05-19",
        "total_amount": 473.59,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37471,
        "date": "2024-05-20",
        "total_amount": 10.69,
        "transaction_type": "income",
        "merchant_group_id": 7530,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Paygamemoney Estonia"
        }
      },
      {
        "id": 38783,
        "date": "2024-05-20",
        "total_amount": 73.25,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 38860,
        "date": "2024-05-20",
        "total_amount": 24,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39425,
        "date": "2024-05-20",
        "total_amount": 3097.32,
        "transaction_type": "expense",
        "merchant_group_id": 7412,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Proper Insurance"
        }
      },
      {
        "id": 39426,
        "date": "2024-05-20",
        "total_amount": 473.59,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39672,
        "date": "2024-05-20",
        "total_amount": 601.24,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39673,
        "date": "2024-05-20",
        "total_amount": 702.36,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38308,
        "date": "2024-05-21",
        "total_amount": 48.75,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38309,
        "date": "2024-05-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39424,
        "date": "2024-05-21",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39444,
        "date": "2024-05-21",
        "total_amount": 1219.29,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39671,
        "date": "2024-05-21",
        "total_amount": 51.25,
        "transaction_type": "expense",
        "merchant_group_id": 7396,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nfs7bjw Complete Ad..."
        }
      },
      {
        "id": 38307,
        "date": "2024-05-22",
        "total_amount": 109.09,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39037,
        "date": "2024-05-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39038,
        "date": "2024-05-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39421,
        "date": "2024-05-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39422,
        "date": "2024-05-22",
        "total_amount": 10000,
        "transaction_type": "income",
        "merchant_group_id": 7396,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nfs7bjw Complete Ad..."
        }
      },
      {
        "id": 39423,
        "date": "2024-05-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39670,
        "date": "2024-05-22",
        "total_amount": 10000,
        "transaction_type": "expense",
        "merchant_group_id": 7563,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Jonathan R Wadsworth Ref Ib0n9m54g8 Bu..."
        }
      },
      {
        "id": 38306,
        "date": "2024-05-23",
        "total_amount": 33.77,
        "transaction_type": "income",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 39419,
        "date": "2024-05-23",
        "total_amount": 3000,
        "transaction_type": "expense",
        "merchant_group_id": 7594,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jonathan Wad Ck Transfer Jonathan Wadsworth"
        }
      },
      {
        "id": 39420,
        "date": "2024-05-23",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39447,
        "date": "2024-05-23",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39669,
        "date": "2024-05-23",
        "total_amount": 400.01,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 39418,
        "date": "2024-05-28",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39442,
        "date": "2024-05-28",
        "total_amount": 1846.88,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39667,
        "date": "2024-05-28",
        "total_amount": 126.57,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39668,
        "date": "2024-05-28",
        "total_amount": 1169.18,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39665,
        "date": "2024-05-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39666,
        "date": "2024-05-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38779,
        "date": "2024-05-31",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39008,
        "date": "2024-05-31",
        "total_amount": 138.95,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39013,
        "date": "2024-05-31",
        "total_amount": 9.77,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39036,
        "date": "2024-05-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39092,
        "date": "2024-05-31",
        "total_amount": 0.02,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 38977,
        "date": "2024-06-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38978,
        "date": "2024-06-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 39007,
        "date": "2024-06-01",
        "total_amount": 78.83,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37470,
        "date": "2024-06-03",
        "total_amount": 15.93,
        "transaction_type": "income",
        "merchant_group_id": 7530,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Paygamemoney Estonia"
        }
      },
      {
        "id": 37781,
        "date": "2024-06-03",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38827,
        "date": "2024-06-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38836,
        "date": "2024-06-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38886,
        "date": "2024-06-03",
        "total_amount": 2500,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39090,
        "date": "2024-06-03",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39091,
        "date": "2024-06-03",
        "total_amount": 2500,
        "transaction_type": "expense",
        "merchant_group_id": 7535,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39416,
        "date": "2024-06-03",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39417,
        "date": "2024-06-03",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39453,
        "date": "2024-06-03",
        "total_amount": 1552.68,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39664,
        "date": "2024-06-03",
        "total_amount": 3130.22,
        "transaction_type": "expense",
        "merchant_group_id": 7399,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0rlwbvjk To Signify Business Essent..."
        }
      },
      {
        "id": 39890,
        "date": "2024-06-03",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38885,
        "date": "2024-06-04",
        "total_amount": 4400,
        "transaction_type": "expense",
        "merchant_group_id": 7396,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nfs7bjw Complete Ad..."
        }
      },
      {
        "id": 38887,
        "date": "2024-06-04",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39445,
        "date": "2024-06-04",
        "total_amount": 1951.64,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39659,
        "date": "2024-06-04",
        "total_amount": 4400,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39660,
        "date": "2024-06-04",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39661,
        "date": "2024-06-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39662,
        "date": "2024-06-04",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39663,
        "date": "2024-06-04",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39089,
        "date": "2024-06-05",
        "total_amount": 140,
        "transaction_type": "expense",
        "merchant_group_id": 7586,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 4150324 Jonathan Wadsworth"
        }
      },
      {
        "id": 39415,
        "date": "2024-06-05",
        "total_amount": 15000,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 39657,
        "date": "2024-06-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39658,
        "date": "2024-06-05",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38884,
        "date": "2024-06-06",
        "total_amount": 600,
        "transaction_type": "income",
        "merchant_group_id": 7426,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Brand Leader 0000385 The Brand Leader Paying B..."
        }
      },
      {
        "id": 37469,
        "date": "2024-06-07",
        "total_amount": 10.69,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38305,
        "date": "2024-06-07",
        "total_amount": 525.17,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38318,
        "date": "2024-06-07",
        "total_amount": 37.82,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38976,
        "date": "2024-06-07",
        "total_amount": 146.35,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39088,
        "date": "2024-06-07",
        "total_amount": 146.35,
        "transaction_type": "expense",
        "merchant_group_id": 7375,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0v7bklny To Signify Business Essent..."
        }
      },
      {
        "id": 39398,
        "date": "2024-06-07",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39656,
        "date": "2024-06-07",
        "total_amount": 1050.68,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38303,
        "date": "2024-06-08",
        "total_amount": 156.77,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38304,
        "date": "2024-06-08",
        "total_amount": 63.56,
        "transaction_type": "income",
        "merchant_group_id": 7333,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Marshalls"
        }
      },
      {
        "id": 38313,
        "date": "2024-06-09",
        "total_amount": 28.77,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39396,
        "date": "2024-06-10",
        "total_amount": 525.17,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39397,
        "date": "2024-06-10",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39655,
        "date": "2024-06-10",
        "total_amount": 10.69,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38302,
        "date": "2024-06-11",
        "total_amount": 210.25,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39408,
        "date": "2024-06-11",
        "total_amount": 1591.77,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38301,
        "date": "2024-06-12",
        "total_amount": 9.28,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39413,
        "date": "2024-06-12",
        "total_amount": 1564.35,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39654,
        "date": "2024-06-12",
        "total_amount": 150,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 39652,
        "date": "2024-06-13",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7369,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cash Withdrawal In Branch"
        }
      },
      {
        "id": 39653,
        "date": "2024-06-13",
        "total_amount": 40,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38778,
        "date": "2024-06-14",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39399,
        "date": "2024-06-14",
        "total_amount": 1621.84,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39651,
        "date": "2024-06-14",
        "total_amount": 651.99,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38300,
        "date": "2024-06-15",
        "total_amount": 92.22,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38317,
        "date": "2024-06-15",
        "total_amount": 972.02,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38299,
        "date": "2024-06-16",
        "total_amount": 57.84,
        "transaction_type": "income",
        "merchant_group_id": 7413,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Classic Ace Hardware"
        }
      },
      {
        "id": 39395,
        "date": "2024-06-17",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39649,
        "date": "2024-06-17",
        "total_amount": 135.42,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39650,
        "date": "2024-06-17",
        "total_amount": 0.1,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39394,
        "date": "2024-06-20",
        "total_amount": 475,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38298,
        "date": "2024-06-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39034,
        "date": "2024-06-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39035,
        "date": "2024-06-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39391,
        "date": "2024-06-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39392,
        "date": "2024-06-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39393,
        "date": "2024-06-24",
        "total_amount": 299,
        "transaction_type": "expense",
        "merchant_group_id": 7608,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sepko Synthetics"
        }
      },
      {
        "id": 39390,
        "date": "2024-06-25",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39409,
        "date": "2024-06-25",
        "total_amount": 1154.3,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39414,
        "date": "2024-06-26",
        "total_amount": 843.9,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38297,
        "date": "2024-06-28",
        "total_amount": 4.99,
        "transaction_type": "income",
        "merchant_group_id": 7340,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Zoom"
        }
      },
      {
        "id": 38777,
        "date": "2024-06-28",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39087,
        "date": "2024-06-28",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39005,
        "date": "2024-06-30",
        "total_amount": 79.19,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39006,
        "date": "2024-06-30",
        "total_amount": 138.95,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38246,
        "date": "2024-07-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38835,
        "date": "2024-07-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38883,
        "date": "2024-07-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38954,
        "date": "2024-07-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38975,
        "date": "2024-07-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 39086,
        "date": "2024-07-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39388,
        "date": "2024-07-01",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39389,
        "date": "2024-07-01",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39400,
        "date": "2024-07-01",
        "total_amount": 1280.4,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38321,
        "date": "2024-07-02",
        "total_amount": 232.31,
        "transaction_type": "income",
        "merchant_group_id": 7343,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lismore Park HOA"
        }
      },
      {
        "id": 38953,
        "date": "2024-07-02",
        "total_amount": 243.38,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39085,
        "date": "2024-07-02",
        "total_amount": 243.38,
        "transaction_type": "expense",
        "merchant_group_id": 7529,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0tqdw3f4 To Signify Business Essent..."
        }
      },
      {
        "id": 39642,
        "date": "2024-07-02",
        "total_amount": 3945.95,
        "transaction_type": "expense",
        "merchant_group_id": 7394,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0r8pv96d To Signify Business Essent..."
        }
      },
      {
        "id": 39643,
        "date": "2024-07-02",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39644,
        "date": "2024-07-02",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39645,
        "date": "2024-07-02",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39646,
        "date": "2024-07-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39647,
        "date": "2024-07-02",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39648,
        "date": "2024-07-02",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39889,
        "date": "2024-07-02",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38882,
        "date": "2024-07-05",
        "total_amount": 1275,
        "transaction_type": "income",
        "merchant_group_id": 7373,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Brand Leader The Brand Leader Paying Bill Via..."
        }
      },
      {
        "id": 39084,
        "date": "2024-07-05",
        "total_amount": 160,
        "transaction_type": "expense",
        "merchant_group_id": 7581,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 3766357 Jonathan Wadsworth"
        }
      },
      {
        "id": 39641,
        "date": "2024-07-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39387,
        "date": "2024-07-08",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39406,
        "date": "2024-07-08",
        "total_amount": 1388.07,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38888,
        "date": "2024-07-09",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39410,
        "date": "2024-07-09",
        "total_amount": 50,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38296,
        "date": "2024-07-11",
        "total_amount": 332.09,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37468,
        "date": "2024-07-12",
        "total_amount": 31.86,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38293,
        "date": "2024-07-12",
        "total_amount": 1905.82,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38294,
        "date": "2024-07-12",
        "total_amount": 13.24,
        "transaction_type": "income",
        "merchant_group_id": 7340,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Zoom"
        }
      },
      {
        "id": 38295,
        "date": "2024-07-12",
        "total_amount": 90,
        "transaction_type": "income",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 38776,
        "date": "2024-07-12",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39412,
        "date": "2024-07-12",
        "total_amount": 1540,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38775,
        "date": "2024-07-15",
        "total_amount": 59.48,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39385,
        "date": "2024-07-15",
        "total_amount": 1905.82,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39386,
        "date": "2024-07-15",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39638,
        "date": "2024-07-15",
        "total_amount": 31.86,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39639,
        "date": "2024-07-15",
        "total_amount": 622.15,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39640,
        "date": "2024-07-15",
        "total_amount": 645.67,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38881,
        "date": "2024-07-16",
        "total_amount": 1500,
        "transaction_type": "expense",
        "merchant_group_id": 7376,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nw6wx26 Complete Ad..."
        }
      },
      {
        "id": 39411,
        "date": "2024-07-16",
        "total_amount": 1289.13,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39636,
        "date": "2024-07-16",
        "total_amount": 1500,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39637,
        "date": "2024-07-16",
        "total_amount": 0.08,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39384,
        "date": "2024-07-17",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39401,
        "date": "2024-07-17",
        "total_amount": 955.45,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39635,
        "date": "2024-07-17",
        "total_amount": 140.74,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39383,
        "date": "2024-07-19",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39403,
        "date": "2024-07-19",
        "total_amount": 1013.65,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39633,
        "date": "2024-07-19",
        "total_amount": 84.76,
        "transaction_type": "income",
        "merchant_group_id": 7596,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Drivewealth Temp 472e047e53e0406 Jonathan Wadswort..."
        }
      },
      {
        "id": 39634,
        "date": "2024-07-19",
        "total_amount": 8,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38292,
        "date": "2024-07-20",
        "total_amount": 50.61,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38291,
        "date": "2024-07-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38952,
        "date": "2024-07-21",
        "total_amount": 19,
        "transaction_type": "expense",
        "merchant_group_id": 7402,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Laracasts Winter Park Fl"
        }
      },
      {
        "id": 38290,
        "date": "2024-07-22",
        "total_amount": 124,
        "transaction_type": "income",
        "merchant_group_id": 7432,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Greenville Appliance R Www Housecall"
        }
      },
      {
        "id": 39032,
        "date": "2024-07-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39033,
        "date": "2024-07-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39380,
        "date": "2024-07-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39381,
        "date": "2024-07-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39382,
        "date": "2024-07-22",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39632,
        "date": "2024-07-22",
        "total_amount": 0.02,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39407,
        "date": "2024-07-23",
        "total_amount": 1390.01,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39405,
        "date": "2024-07-24",
        "total_amount": 2004.99,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38289,
        "date": "2024-07-25",
        "total_amount": 21.19,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39631,
        "date": "2024-07-25",
        "total_amount": 18122.4,
        "transaction_type": "income",
        "merchant_group_id": 7569,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Instant From Wealthfront On 07 25 Ref 202407251210..."
        }
      },
      {
        "id": 38774,
        "date": "2024-07-26",
        "total_amount": 4051.47,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39630,
        "date": "2024-07-26",
        "total_amount": 10000,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 38288,
        "date": "2024-07-27",
        "total_amount": 10.81,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38286,
        "date": "2024-07-28",
        "total_amount": 4.99,
        "transaction_type": "income",
        "merchant_group_id": 7340,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Zoom"
        }
      },
      {
        "id": 38287,
        "date": "2024-07-28",
        "total_amount": 135.09,
        "transaction_type": "income",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 39379,
        "date": "2024-07-29",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39629,
        "date": "2024-07-29",
        "total_amount": 8122,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 39402,
        "date": "2024-07-30",
        "total_amount": 100,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39404,
        "date": "2024-07-30",
        "total_amount": 2036.27,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39083,
        "date": "2024-07-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39626,
        "date": "2024-07-31",
        "total_amount": 370.63,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 39627,
        "date": "2024-07-31",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39628,
        "date": "2024-07-31",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38245,
        "date": "2024-08-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38834,
        "date": "2024-08-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38880,
        "date": "2024-08-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38951,
        "date": "2024-08-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38963,
        "date": "2024-08-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39082,
        "date": "2024-08-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39378,
        "date": "2024-08-01",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39625,
        "date": "2024-08-01",
        "total_amount": 255,
        "transaction_type": "expense",
        "merchant_group_id": 7341,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roots Real Estate"
        }
      },
      {
        "id": 39902,
        "date": "2024-08-01",
        "total_amount": 138.95,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39903,
        "date": "2024-08-01",
        "total_amount": 79.41,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38950,
        "date": "2024-08-02",
        "total_amount": 252.97,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39081,
        "date": "2024-08-02",
        "total_amount": 252.97,
        "transaction_type": "expense",
        "merchant_group_id": 7529,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0tqdw3f4 To Signify Business Essent..."
        }
      },
      {
        "id": 39620,
        "date": "2024-08-02",
        "total_amount": 3495.93,
        "transaction_type": "expense",
        "merchant_group_id": 7554,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0p3fxgkm To Wells Fargo Active Cash..."
        }
      },
      {
        "id": 39621,
        "date": "2024-08-02",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39622,
        "date": "2024-08-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39623,
        "date": "2024-08-02",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39624,
        "date": "2024-08-02",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39880,
        "date": "2024-08-02",
        "total_amount": 7.96,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39888,
        "date": "2024-08-02",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38889,
        "date": "2024-08-05",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39080,
        "date": "2024-08-05",
        "total_amount": 160,
        "transaction_type": "expense",
        "merchant_group_id": 7580,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 4011602 Jonathan Wadsworth"
        }
      },
      {
        "id": 39619,
        "date": "2024-08-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 38315,
        "date": "2024-08-06",
        "total_amount": 120,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39618,
        "date": "2024-08-06",
        "total_amount": 762.38,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38285,
        "date": "2024-08-07",
        "total_amount": 196.63,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39376,
        "date": "2024-08-07",
        "total_amount": 615,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39377,
        "date": "2024-08-07",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38283,
        "date": "2024-08-09",
        "total_amount": 822.01,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38284,
        "date": "2024-08-09",
        "total_amount": 42.36,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38773,
        "date": "2024-08-09",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39617,
        "date": "2024-08-09",
        "total_amount": 131,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38282,
        "date": "2024-08-10",
        "total_amount": 36.04,
        "transaction_type": "income",
        "merchant_group_id": 7391,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Target Taylors"
        }
      },
      {
        "id": 38280,
        "date": "2024-08-11",
        "total_amount": 68.4,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38281,
        "date": "2024-08-11",
        "total_amount": 368.73,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39374,
        "date": "2024-08-12",
        "total_amount": 822.01,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39375,
        "date": "2024-08-12",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39616,
        "date": "2024-08-12",
        "total_amount": 590,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39859,
        "date": "2024-08-12",
        "total_amount": 1506.41,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39359,
        "date": "2024-08-13",
        "total_amount": 778.92,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39363,
        "date": "2024-08-13",
        "total_amount": 800.64,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39370,
        "date": "2024-08-13",
        "total_amount": 1890,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39615,
        "date": "2024-08-14",
        "total_amount": 170.88,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 39358,
        "date": "2024-08-15",
        "total_amount": 360,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39361,
        "date": "2024-08-15",
        "total_amount": 1071.46,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39614,
        "date": "2024-08-15",
        "total_amount": 234.88,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38949,
        "date": "2024-08-18",
        "total_amount": 11.35,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39907,
        "date": "2024-08-18",
        "total_amount": 20,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": undefined
      },
      {
        "id": 39908,
        "date": "2024-08-18",
        "total_amount": 18,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": undefined
      },
      {
        "id": 39357,
        "date": "2024-08-19",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39613,
        "date": "2024-08-19",
        "total_amount": 670.54,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38279,
        "date": "2024-08-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38316,
        "date": "2024-08-21",
        "total_amount": 4.18,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38948,
        "date": "2024-08-21",
        "total_amount": 19,
        "transaction_type": "expense",
        "merchant_group_id": 7402,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Laracasts Winter Park Fl"
        }
      },
      {
        "id": 39862,
        "date": "2024-08-21",
        "total_amount": 1342.29,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39030,
        "date": "2024-08-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39031,
        "date": "2024-08-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39355,
        "date": "2024-08-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39356,
        "date": "2024-08-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38772,
        "date": "2024-08-23",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39354,
        "date": "2024-08-23",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38947,
        "date": "2024-08-25",
        "total_amount": 39,
        "transaction_type": "expense",
        "merchant_group_id": 7552,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Laravel Fo Trial Over New York Ny"
        }
      },
      {
        "id": 39612,
        "date": "2024-08-26",
        "total_amount": 1.04,
        "transaction_type": "income",
        "merchant_group_id": 7556,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Karma Transfer Jonathan Wadsworth"
        }
      },
      {
        "id": 38319,
        "date": "2024-08-27",
        "total_amount": 104.94,
        "transaction_type": "income",
        "merchant_group_id": 7290,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Wyze Labs"
        }
      },
      {
        "id": 39360,
        "date": "2024-08-27",
        "total_amount": 2134,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38278,
        "date": "2024-08-28",
        "total_amount": 4.99,
        "transaction_type": "income",
        "merchant_group_id": 7340,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Zoom"
        }
      },
      {
        "id": 39870,
        "date": "2024-08-29",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39079,
        "date": "2024-08-30",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39610,
        "date": "2024-08-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39611,
        "date": "2024-08-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37467,
        "date": "2024-09-01",
        "total_amount": 95,
        "transaction_type": "income",
        "merchant_group_id": 7367,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chase Card Services"
        }
      },
      {
        "id": 38320,
        "date": "2024-09-01",
        "total_amount": 210.94,
        "transaction_type": "income",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 38962,
        "date": "2024-09-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38969,
        "date": "2024-09-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39900,
        "date": "2024-09-01",
        "total_amount": 138.95,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39901,
        "date": "2024-09-01",
        "total_amount": 65.41,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38822,
        "date": "2024-09-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38840,
        "date": "2024-09-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38879,
        "date": "2024-09-03",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39078,
        "date": "2024-09-03",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39352,
        "date": "2024-09-03",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39353,
        "date": "2024-09-03",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39609,
        "date": "2024-09-03",
        "total_amount": 143,
        "transaction_type": "income",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 39887,
        "date": "2024-09-03",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38277,
        "date": "2024-09-04",
        "total_amount": 5.8,
        "transaction_type": "income",
        "merchant_group_id": 7289,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Usps"
        }
      },
      {
        "id": 38890,
        "date": "2024-09-04",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38973,
        "date": "2024-09-04",
        "total_amount": 63.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39604,
        "date": "2024-09-04",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7398,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39605,
        "date": "2024-09-04",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39606,
        "date": "2024-09-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39607,
        "date": "2024-09-04",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39608,
        "date": "2024-09-04",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38273,
        "date": "2024-09-05",
        "total_amount": 8.47,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39077,
        "date": "2024-09-05",
        "total_amount": 160,
        "transaction_type": "expense",
        "merchant_group_id": 7585,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 4180578 Jonathan Wadsworth"
        }
      },
      {
        "id": 39367,
        "date": "2024-09-05",
        "total_amount": 1274.58,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39603,
        "date": "2024-09-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 38771,
        "date": "2024-09-06",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39351,
        "date": "2024-09-06",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37466,
        "date": "2024-09-09",
        "total_amount": 95,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38269,
        "date": "2024-09-09",
        "total_amount": 1249.47,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38270,
        "date": "2024-09-09",
        "total_amount": 20.13,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38271,
        "date": "2024-09-09",
        "total_amount": 9347,
        "transaction_type": "income",
        "merchant_group_id": 7510,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Sanders Heating Air Conditioning"
        }
      },
      {
        "id": 38272,
        "date": "2024-09-09",
        "total_amount": 49.21,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38878,
        "date": "2024-09-09",
        "total_amount": 7000,
        "transaction_type": "expense",
        "merchant_group_id": 7398,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39348,
        "date": "2024-09-09",
        "total_amount": 5000,
        "transaction_type": "income",
        "merchant_group_id": 7398,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39349,
        "date": "2024-09-09",
        "total_amount": 17000,
        "transaction_type": "expense",
        "merchant_group_id": 7398,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39350,
        "date": "2024-09-09",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39599,
        "date": "2024-09-09",
        "total_amount": 18215.7,
        "transaction_type": "income",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 39600,
        "date": "2024-09-09",
        "total_amount": 17000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39601,
        "date": "2024-09-09",
        "total_amount": 7000,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39602,
        "date": "2024-09-09",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 37479,
        "date": "2024-09-10",
        "total_amount": 13.49,
        "transaction_type": "income",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38946,
        "date": "2024-09-10",
        "total_amount": 303.54,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39076,
        "date": "2024-09-10",
        "total_amount": 303.54,
        "transaction_type": "expense",
        "merchant_group_id": 7527,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0vjhhyr2 To Signify Business Essent..."
        }
      },
      {
        "id": 39346,
        "date": "2024-09-10",
        "total_amount": 1249.47,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39347,
        "date": "2024-09-10",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7594,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jonathan Wad Ck Transfer Jonathan Wadsworth"
        }
      },
      {
        "id": 39364,
        "date": "2024-09-10",
        "total_amount": 1274.58,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39596,
        "date": "2024-09-10",
        "total_amount": 318.22,
        "transaction_type": "income",
        "merchant_group_id": 7541,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wells Fargo Rewards"
        }
      },
      {
        "id": 39597,
        "date": "2024-09-10",
        "total_amount": 95,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39598,
        "date": "2024-09-10",
        "total_amount": 30075,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 38268,
        "date": "2024-09-11",
        "total_amount": 359.06,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38877,
        "date": "2024-09-11",
        "total_amount": 1382.47,
        "transaction_type": "income",
        "merchant_group_id": 7395,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wave Sv9t Jonathan Wadsworth"
        }
      },
      {
        "id": 39365,
        "date": "2024-09-11",
        "total_amount": 1613.11,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39592,
        "date": "2024-09-11",
        "total_amount": 79.58,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39593,
        "date": "2024-09-11",
        "total_amount": 96.8,
        "transaction_type": "income",
        "merchant_group_id": 7324,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Rewards"
        }
      },
      {
        "id": 39594,
        "date": "2024-09-11",
        "total_amount": 1042.89,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39595,
        "date": "2024-09-11",
        "total_amount": 81,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38770,
        "date": "2024-09-12",
        "total_amount": 34.35,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39911,
        "date": "2024-09-13",
        "total_amount": 2723.81,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39345,
        "date": "2024-09-16",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39591,
        "date": "2024-09-16",
        "total_amount": 184.26,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38267,
        "date": "2024-09-18",
        "total_amount": 20.83,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": undefined
      },
      {
        "id": 38945,
        "date": "2024-09-18",
        "total_amount": 15,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39366,
        "date": "2024-09-18",
        "total_amount": 1071.46,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38252,
        "date": "2024-09-19",
        "total_amount": 76.28,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39344,
        "date": "2024-09-19",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38769,
        "date": "2024-09-20",
        "total_amount": 4051.47,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38266,
        "date": "2024-09-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39028,
        "date": "2024-09-23",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39029,
        "date": "2024-09-23",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39341,
        "date": "2024-09-23",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39342,
        "date": "2024-09-23",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39343,
        "date": "2024-09-23",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39362,
        "date": "2024-09-23",
        "total_amount": 1013.65,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39590,
        "date": "2024-09-23",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39371,
        "date": "2024-09-26",
        "total_amount": 864,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39589,
        "date": "2024-09-26",
        "total_amount": 14000,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38265,
        "date": "2024-09-28",
        "total_amount": 4.99,
        "transaction_type": "income",
        "merchant_group_id": 7340,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Zoom"
        }
      },
      {
        "id": 39027,
        "date": "2024-09-30",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39075,
        "date": "2024-09-30",
        "total_amount": 0.02,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 38244,
        "date": "2024-10-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38263,
        "date": "2024-10-01",
        "total_amount": 63.58,
        "transaction_type": "income",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 38264,
        "date": "2024-10-01",
        "total_amount": 178.2,
        "transaction_type": "income",
        "merchant_group_id": 7510,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Sanders Heating Air Conditioning"
        }
      },
      {
        "id": 38833,
        "date": "2024-10-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38876,
        "date": "2024-10-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38961,
        "date": "2024-10-01",
        "total_amount": 28.67,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38966,
        "date": "2024-10-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38968,
        "date": "2024-10-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39074,
        "date": "2024-10-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39340,
        "date": "2024-10-01",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39373,
        "date": "2024-10-01",
        "total_amount": 1141.14,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39899,
        "date": "2024-10-01",
        "total_amount": 138.95,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39583,
        "date": "2024-10-02",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39584,
        "date": "2024-10-02",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39585,
        "date": "2024-10-02",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39586,
        "date": "2024-10-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39587,
        "date": "2024-10-02",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39588,
        "date": "2024-10-02",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38260,
        "date": "2024-10-03",
        "total_amount": 2.66,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38261,
        "date": "2024-10-03",
        "total_amount": 90,
        "transaction_type": "income",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 38262,
        "date": "2024-10-03",
        "total_amount": 31.8,
        "transaction_type": "income",
        "merchant_group_id": 7482,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Five Below"
        }
      },
      {
        "id": 39886,
        "date": "2024-10-03",
        "total_amount": 0.56,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38768,
        "date": "2024-10-04",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38891,
        "date": "2024-10-04",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39372,
        "date": "2024-10-04",
        "total_amount": 1141.14,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38874,
        "date": "2024-10-05",
        "total_amount": 31.26,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38240,
        "date": "2024-10-06",
        "total_amount": 88.03,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38766,
        "date": "2024-10-07",
        "total_amount": 10,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 38767,
        "date": "2024-10-07",
        "total_amount": 642.1,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39073,
        "date": "2024-10-07",
        "total_amount": 160,
        "transaction_type": "expense",
        "merchant_group_id": 7589,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 4572535 Jonathan Wadsworth"
        }
      },
      {
        "id": 39581,
        "date": "2024-10-07",
        "total_amount": 6502.23,
        "transaction_type": "income",
        "merchant_group_id": 7412,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Proper Insurance"
        }
      },
      {
        "id": 39582,
        "date": "2024-10-07",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39578,
        "date": "2024-10-08",
        "total_amount": 750,
        "transaction_type": "income",
        "merchant_group_id": 7562,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Fema Treas 310 Misc Pay Xxxxx0700 Jonathan Wadswor..."
        }
      },
      {
        "id": 39579,
        "date": "2024-10-08",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39580,
        "date": "2024-10-08",
        "total_amount": 10000,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 38112,
        "date": "2024-10-09",
        "total_amount": 359.32,
        "transaction_type": "income",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 38765,
        "date": "2024-10-09",
        "total_amount": 63.94,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 39871,
        "date": "2024-10-09",
        "total_amount": 40,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38859,
        "date": "2024-10-10",
        "total_amount": 3500,
        "transaction_type": "expense",
        "merchant_group_id": 7538,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0ptvj6j6 Everyday Ch..."
        }
      },
      {
        "id": 38944,
        "date": "2024-10-10",
        "total_amount": 298.79,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39071,
        "date": "2024-10-10",
        "total_amount": 298.79,
        "transaction_type": "expense",
        "merchant_group_id": 7529,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0tqdw3f4 To Signify Business Essent..."
        }
      },
      {
        "id": 39072,
        "date": "2024-10-10",
        "total_amount": 1800,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 39575,
        "date": "2024-10-10",
        "total_amount": 3500,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39576,
        "date": "2024-10-10",
        "total_amount": 1800,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39577,
        "date": "2024-10-10",
        "total_amount": 5544.83,
        "transaction_type": "expense",
        "merchant_group_id": 7527,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0vjhhyr2 To Signify Business Essent..."
        }
      },
      {
        "id": 37950,
        "date": "2024-10-11",
        "total_amount": 8947,
        "transaction_type": "income",
        "merchant_group_id": 7510,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Sanders Heating Air Conditioning"
        }
      },
      {
        "id": 38108,
        "date": "2024-10-11",
        "total_amount": 284.48,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39574,
        "date": "2024-10-11",
        "total_amount": 680,
        "transaction_type": "expense",
        "merchant_group_id": 7528,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Samaritan Ministries"
        }
      },
      {
        "id": 37898,
        "date": "2024-10-13",
        "total_amount": 10314.99,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37465,
        "date": "2024-10-14",
        "total_amount": 13.49,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39026,
        "date": "2024-10-15",
        "total_amount": 450,
        "transaction_type": "expense",
        "merchant_group_id": 7535,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39338,
        "date": "2024-10-15",
        "total_amount": 450,
        "transaction_type": "income",
        "merchant_group_id": 7535,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39339,
        "date": "2024-10-15",
        "total_amount": 10314.99,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39369,
        "date": "2024-10-15",
        "total_amount": 1926,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39573,
        "date": "2024-10-15",
        "total_amount": 13.49,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 37717,
        "date": "2024-10-16",
        "total_amount": 16.95,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37757,
        "date": "2024-10-16",
        "total_amount": 71.01,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39337,
        "date": "2024-10-16",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39572,
        "date": "2024-10-17",
        "total_amount": 140.19,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38764,
        "date": "2024-10-18",
        "total_amount": 4051.51,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38943,
        "date": "2024-10-18",
        "total_amount": 19,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39571,
        "date": "2024-10-18",
        "total_amount": 3490.35,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37716,
        "date": "2024-10-21",
        "total_amount": 39.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39368,
        "date": "2024-10-21",
        "total_amount": 1969.1,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38972,
        "date": "2024-10-22",
        "total_amount": 14.95,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39024,
        "date": "2024-10-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39025,
        "date": "2024-10-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39335,
        "date": "2024-10-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39336,
        "date": "2024-10-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39569,
        "date": "2024-10-22",
        "total_amount": 3242.51,
        "transaction_type": "income",
        "merchant_group_id": 7561,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Money Transfer Authorized On 10 22 From Allstate I..."
        }
      },
      {
        "id": 39570,
        "date": "2024-10-22",
        "total_amount": 804.76,
        "transaction_type": "expense",
        "merchant_group_id": 7508,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Truist"
        }
      },
      {
        "id": 39322,
        "date": "2024-10-23",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39568,
        "date": "2024-10-23",
        "total_amount": 192.67,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 39326,
        "date": "2024-10-28",
        "total_amount": 1481.19,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39565,
        "date": "2024-10-28",
        "total_amount": 12.36,
        "transaction_type": "expense",
        "merchant_group_id": 7396,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nfs7bjw Complete Ad..."
        }
      },
      {
        "id": 39566,
        "date": "2024-10-28",
        "total_amount": 1.38,
        "transaction_type": "expense",
        "merchant_group_id": 7396,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0nfs7bjw Complete Ad..."
        }
      },
      {
        "id": 39567,
        "date": "2024-10-28",
        "total_amount": 1.65,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 39320,
        "date": "2024-10-30",
        "total_amount": 1050,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39321,
        "date": "2024-10-30",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39563,
        "date": "2024-10-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39564,
        "date": "2024-10-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38960,
        "date": "2024-10-31",
        "total_amount": 36.64,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39070,
        "date": "2024-10-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 38243,
        "date": "2024-11-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38763,
        "date": "2024-11-01",
        "total_amount": 4034.36,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38832,
        "date": "2024-11-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38858,
        "date": "2024-11-01",
        "total_amount": 865.74,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38959,
        "date": "2024-11-01",
        "total_amount": 164.83,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38965,
        "date": "2024-11-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38967,
        "date": "2024-11-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39069,
        "date": "2024-11-01",
        "total_amount": 865.74,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39319,
        "date": "2024-11-01",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39562,
        "date": "2024-11-01",
        "total_amount": 883.87,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39885,
        "date": "2024-11-02",
        "total_amount": 0.56,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39318,
        "date": "2024-11-04",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39558,
        "date": "2024-11-04",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39559,
        "date": "2024-11-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39560,
        "date": "2024-11-04",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39561,
        "date": "2024-11-04",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38892,
        "date": "2024-11-05",
        "total_amount": 3000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39068,
        "date": "2024-11-05",
        "total_amount": 170,
        "transaction_type": "expense",
        "merchant_group_id": 7584,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 4632640 Jonathan Wadsworth"
        }
      },
      {
        "id": 39334,
        "date": "2024-11-05",
        "total_amount": 1177.86,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39555,
        "date": "2024-11-05",
        "total_amount": 500,
        "transaction_type": "income",
        "merchant_group_id": 7521,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Edeposit In Branch 11 05 24 04 57 59 Pm 6011 Wade..."
        }
      },
      {
        "id": 39556,
        "date": "2024-11-05",
        "total_amount": 5,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 39557,
        "date": "2024-11-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39317,
        "date": "2024-11-06",
        "total_amount": 501.43,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 39324,
        "date": "2024-11-07",
        "total_amount": 1274.58,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39316,
        "date": "2024-11-08",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37715,
        "date": "2024-11-11",
        "total_amount": 174.76,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38942,
        "date": "2024-11-11",
        "total_amount": 217.39,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38857,
        "date": "2024-11-12",
        "total_amount": 217.39,
        "transaction_type": "expense",
        "merchant_group_id": 7534,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0q7jt6g8 To Signify Business Essent..."
        }
      },
      {
        "id": 39315,
        "date": "2024-11-12",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39553,
        "date": "2024-11-12",
        "total_amount": 222.95,
        "transaction_type": "expense",
        "merchant_group_id": 7534,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0q7jt6g8 To Signify Business Essent..."
        }
      },
      {
        "id": 39554,
        "date": "2024-11-12",
        "total_amount": 81,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39314,
        "date": "2024-11-13",
        "total_amount": 780,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39327,
        "date": "2024-11-13",
        "total_amount": 1279.43,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39552,
        "date": "2024-11-13",
        "total_amount": 15.53,
        "transaction_type": "income",
        "merchant_group_id": 7555,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Money Transfer Authorized On 11 13 From Allstate I..."
        }
      },
      {
        "id": 38974,
        "date": "2024-11-14",
        "total_amount": 10.44,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39333,
        "date": "2024-11-14",
        "total_amount": 936,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39551,
        "date": "2024-11-14",
        "total_amount": 91.57,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38762,
        "date": "2024-11-15",
        "total_amount": 4034.36,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39313,
        "date": "2024-11-15",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39325,
        "date": "2024-11-15",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39549,
        "date": "2024-11-15",
        "total_amount": 64.54,
        "transaction_type": "income",
        "merchant_group_id": 7595,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Comm Payroll 215 Wadsworth Emmag"
        }
      },
      {
        "id": 39550,
        "date": "2024-11-15",
        "total_amount": 64.64,
        "transaction_type": "income",
        "merchant_group_id": 7576,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Comm Payroll 169 Wadsworth Heathera"
        }
      },
      {
        "id": 37464,
        "date": "2024-11-16",
        "total_amount": 6305,
        "transaction_type": "income",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38941,
        "date": "2024-11-18",
        "total_amount": 19,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39312,
        "date": "2024-11-18",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39909,
        "date": "2024-11-19",
        "total_amount": 1141.19,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37463,
        "date": "2024-11-20",
        "total_amount": 2,
        "transaction_type": "income",
        "merchant_group_id": 7490,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Greenville Spartanburg Greer Sc"
        }
      },
      {
        "id": 37478,
        "date": "2024-11-20",
        "total_amount": 25.68,
        "transaction_type": "income",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37460,
        "date": "2024-11-21",
        "total_amount": 17.25,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37461,
        "date": "2024-11-21",
        "total_amount": 132.82,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37462,
        "date": "2024-11-21",
        "total_amount": 9.64,
        "transaction_type": "income",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37713,
        "date": "2024-11-21",
        "total_amount": 30.66,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37714,
        "date": "2024-11-21",
        "total_amount": 54.02,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39548,
        "date": "2024-11-21",
        "total_amount": 15000,
        "transaction_type": "income",
        "merchant_group_id": 7523,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Instant From Wealthfront On 11 21 Ref 202411211210..."
        }
      },
      {
        "id": 37459,
        "date": "2024-11-22",
        "total_amount": 2.15,
        "transaction_type": "income",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38870,
        "date": "2024-11-22",
        "total_amount": 41.64,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38871,
        "date": "2024-11-22",
        "total_amount": 14.78,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39022,
        "date": "2024-11-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39023,
        "date": "2024-11-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39309,
        "date": "2024-11-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39310,
        "date": "2024-11-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39311,
        "date": "2024-11-22",
        "total_amount": 3255,
        "transaction_type": "expense",
        "merchant_group_id": 7448,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Autotrader"
        }
      },
      {
        "id": 39547,
        "date": "2024-11-22",
        "total_amount": 5177.12,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37458,
        "date": "2024-11-23",
        "total_amount": 57.77,
        "transaction_type": "income",
        "merchant_group_id": 7410,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Olive Garden"
        }
      },
      {
        "id": 37482,
        "date": "2024-11-24",
        "total_amount": 21.67,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37712,
        "date": "2024-11-25",
        "total_amount": 9806.78,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39307,
        "date": "2024-11-25",
        "total_amount": 10000,
        "transaction_type": "income",
        "merchant_group_id": 7398,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39308,
        "date": "2024-11-25",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39329,
        "date": "2024-11-25",
        "total_amount": 1274.58,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39545,
        "date": "2024-11-25",
        "total_amount": 10000,
        "transaction_type": "expense",
        "merchant_group_id": 7535,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Jonathan R Wadsworth Business Market..."
        }
      },
      {
        "id": 39546,
        "date": "2024-11-25",
        "total_amount": 917.83,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 39979,
        "date": "2024-11-25",
        "total_amount": 73,
        "transaction_type": "expense",
        "merchant_group_id": 7590,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "U Relax Massage Taylors"
        }
      },
      {
        "id": 39306,
        "date": "2024-11-26",
        "total_amount": 9806.78,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39331,
        "date": "2024-11-26",
        "total_amount": 2663,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39544,
        "date": "2024-11-26",
        "total_amount": 785.33,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37490,
        "date": "2024-11-27",
        "total_amount": 12.24,
        "transaction_type": "income",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37711,
        "date": "2024-11-27",
        "total_amount": 78.44,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38940,
        "date": "2024-11-27",
        "total_amount": 246.73,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39067,
        "date": "2024-11-27",
        "total_amount": 246.73,
        "transaction_type": "expense",
        "merchant_group_id": 7430,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0thyqmd3 To Signify Business Essent..."
        }
      },
      {
        "id": 39542,
        "date": "2024-11-27",
        "total_amount": 64.54,
        "transaction_type": "expense",
        "merchant_group_id": 7557,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth E Ref Ib0qdsy92y Way2save Sa..."
        }
      },
      {
        "id": 39543,
        "date": "2024-11-27",
        "total_amount": 1609.52,
        "transaction_type": "expense",
        "merchant_group_id": 7508,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Truist"
        }
      },
      {
        "id": 37457,
        "date": "2024-11-29",
        "total_amount": 10.58,
        "transaction_type": "income",
        "merchant_group_id": 7549,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Hamricks"
        }
      },
      {
        "id": 37477,
        "date": "2024-11-29",
        "total_amount": 11.86,
        "transaction_type": "income",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37485,
        "date": "2024-11-29",
        "total_amount": 29.68,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37486,
        "date": "2024-11-29",
        "total_amount": 23.32,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37487,
        "date": "2024-11-29",
        "total_amount": 18.13,
        "transaction_type": "income",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37488,
        "date": "2024-11-29",
        "total_amount": 8.3,
        "transaction_type": "income",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37709,
        "date": "2024-11-29",
        "total_amount": 25.44,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38761,
        "date": "2024-11-29",
        "total_amount": 4734.36,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39066,
        "date": "2024-11-29",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39323,
        "date": "2024-11-29",
        "total_amount": 1844.94,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37456,
        "date": "2024-11-30",
        "total_amount": 176.67,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38958,
        "date": "2024-11-30",
        "total_amount": 160.1,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37453,
        "date": "2024-12-01",
        "total_amount": 8.73,
        "transaction_type": "income",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37454,
        "date": "2024-12-01",
        "total_amount": 6.47,
        "transaction_type": "income",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 37455,
        "date": "2024-12-01",
        "total_amount": 5.93,
        "transaction_type": "income",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38939,
        "date": "2024-12-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38957,
        "date": "2024-12-01",
        "total_amount": 6.14,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38971,
        "date": "2024-12-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38817,
        "date": "2024-12-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38839,
        "date": "2024-12-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39304,
        "date": "2024-12-02",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39305,
        "date": "2024-12-02",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39884,
        "date": "2024-12-02",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39303,
        "date": "2024-12-03",
        "total_amount": 708.98,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39535,
        "date": "2024-12-03",
        "total_amount": 128.87,
        "transaction_type": "expense",
        "merchant_group_id": 7534,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0q7jt6g8 To Signify Business Essent..."
        }
      },
      {
        "id": 39536,
        "date": "2024-12-03",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39537,
        "date": "2024-12-03",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39538,
        "date": "2024-12-03",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39539,
        "date": "2024-12-03",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39540,
        "date": "2024-12-03",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39541,
        "date": "2024-12-03",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37452,
        "date": "2024-12-04",
        "total_amount": 7.34,
        "transaction_type": "income",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 37484,
        "date": "2024-12-04",
        "total_amount": 27.23,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37491,
        "date": "2024-12-04",
        "total_amount": 63.54,
        "transaction_type": "income",
        "merchant_group_id": 7290,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Wyze Labs"
        }
      },
      {
        "id": 37450,
        "date": "2024-12-05",
        "total_amount": 10.69,
        "transaction_type": "income",
        "merchant_group_id": 7530,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Paygamemoney Estonia"
        }
      },
      {
        "id": 37451,
        "date": "2024-12-05",
        "total_amount": 5.71,
        "transaction_type": "income",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37701,
        "date": "2024-12-05",
        "total_amount": 147.34,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39065,
        "date": "2024-12-05",
        "total_amount": 170,
        "transaction_type": "expense",
        "merchant_group_id": 7574,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 5347357 Jonathan Wadsworth"
        }
      },
      {
        "id": 39302,
        "date": "2024-12-05",
        "total_amount": 708.98,
        "transaction_type": "income",
        "merchant_group_id": 7537,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0qmwbnnc Everyday Ch..."
        }
      },
      {
        "id": 39534,
        "date": "2024-12-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37475,
        "date": "2024-12-06",
        "total_amount": 0.97,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": undefined
      },
      {
        "id": 37476,
        "date": "2024-12-06",
        "total_amount": 9.7,
        "transaction_type": "income",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37481,
        "date": "2024-12-06",
        "total_amount": 9.43,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38826,
        "date": "2024-12-06",
        "total_amount": 6.48,
        "transaction_type": "income",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 38869,
        "date": "2024-12-06",
        "total_amount": 25.61,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39858,
        "date": "2024-12-06",
        "total_amount": 2109.75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37489,
        "date": "2024-12-07",
        "total_amount": 1.93,
        "transaction_type": "income",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37483,
        "date": "2024-12-08",
        "total_amount": 21.64,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37480,
        "date": "2024-12-09",
        "total_amount": 5.17,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37449,
        "date": "2024-12-10",
        "total_amount": 16.8,
        "transaction_type": "income",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37493,
        "date": "2024-12-11",
        "total_amount": 44.37,
        "transaction_type": "income",
        "merchant_group_id": 7342,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Spinx"
        }
      },
      {
        "id": 37700,
        "date": "2024-12-11",
        "total_amount": 168.92,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39301,
        "date": "2024-12-11",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37699,
        "date": "2024-12-12",
        "total_amount": 71,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39332,
        "date": "2024-12-12",
        "total_amount": 1196.95,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38760,
        "date": "2024-12-13",
        "total_amount": 4034.36,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39299,
        "date": "2024-12-13",
        "total_amount": 150,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39300,
        "date": "2024-12-13",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39330,
        "date": "2024-12-13",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37448,
        "date": "2024-12-16",
        "total_amount": 6993.21,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37698,
        "date": "2024-12-16",
        "total_amount": 439.66,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38759,
        "date": "2024-12-16",
        "total_amount": 75.74,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38866,
        "date": "2024-12-16",
        "total_amount": 10000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39297,
        "date": "2024-12-16",
        "total_amount": 10000,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 39298,
        "date": "2024-12-16",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37435,
        "date": "2024-12-17",
        "total_amount": 2.15,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37447,
        "date": "2024-12-17",
        "total_amount": 73.63,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38756,
        "date": "2024-12-17",
        "total_amount": 3427.98,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38757,
        "date": "2024-12-17",
        "total_amount": 6993.21,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39296,
        "date": "2024-12-17",
        "total_amount": 439.66,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39328,
        "date": "2024-12-17",
        "total_amount": 1274.58,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38856,
        "date": "2024-12-18",
        "total_amount": 2500,
        "transaction_type": "expense",
        "merchant_group_id": 7537,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0qmwbnnc Everyday Ch..."
        }
      },
      {
        "id": 38865,
        "date": "2024-12-18",
        "total_amount": 2500,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37434,
        "date": "2024-12-19",
        "total_amount": 38,
        "transaction_type": "income",
        "merchant_group_id": 7516,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Telemed"
        }
      },
      {
        "id": 37697,
        "date": "2024-12-21",
        "total_amount": 54.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38753,
        "date": "2024-12-23",
        "total_amount": 2229,
        "transaction_type": "income",
        "merchant_group_id": 7412,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Proper Insurance"
        }
      },
      {
        "id": 38754,
        "date": "2024-12-23",
        "total_amount": 218.07,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39020,
        "date": "2024-12-23",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39021,
        "date": "2024-12-23",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39280,
        "date": "2024-12-23",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39281,
        "date": "2024-12-23",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39295,
        "date": "2024-12-23",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39533,
        "date": "2024-12-23",
        "total_amount": 804.76,
        "transaction_type": "expense",
        "merchant_group_id": 7508,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Truist"
        }
      },
      {
        "id": 39279,
        "date": "2024-12-24",
        "total_amount": 309.5,
        "transaction_type": "income",
        "merchant_group_id": 7324,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Rewards"
        }
      },
      {
        "id": 39285,
        "date": "2024-12-24",
        "total_amount": 1390.98,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39294,
        "date": "2024-12-24",
        "total_amount": 954,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39290,
        "date": "2024-12-26",
        "total_amount": 1551.76,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38750,
        "date": "2024-12-27",
        "total_amount": 4034.36,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38752,
        "date": "2024-12-27",
        "total_amount": 527.57,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38864,
        "date": "2024-12-27",
        "total_amount": 309.5,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39278,
        "date": "2024-12-27",
        "total_amount": 309.5,
        "transaction_type": "expense",
        "merchant_group_id": 7398,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 38938,
        "date": "2024-12-29",
        "total_amount": 182.07,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37696,
        "date": "2024-12-30",
        "total_amount": 90,
        "transaction_type": "income",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 38748,
        "date": "2024-12-30",
        "total_amount": 197.41,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38749,
        "date": "2024-12-30",
        "total_amount": 207.41,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38937,
        "date": "2024-12-30",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7405,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Nebula Subscription Denver"
        }
      },
      {
        "id": 39064,
        "date": "2024-12-30",
        "total_amount": 182.07,
        "transaction_type": "expense",
        "merchant_group_id": 7399,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0rlwbvjk To Signify Business Essent..."
        }
      },
      {
        "id": 39277,
        "date": "2024-12-30",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38956,
        "date": "2024-12-31",
        "total_amount": 29.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39063,
        "date": "2024-12-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39288,
        "date": "2024-12-31",
        "total_amount": 2290.17,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38964,
        "date": "2025-01-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38970,
        "date": "2025-01-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38745,
        "date": "2025-01-02",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38746,
        "date": "2025-01-02",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38747,
        "date": "2025-01-02",
        "total_amount": 172,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38751,
        "date": "2025-01-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38755,
        "date": "2025-01-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38821,
        "date": "2025-01-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38831,
        "date": "2025-01-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39276,
        "date": "2025-01-02",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39883,
        "date": "2025-01-02",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37704,
        "date": "2025-01-03",
        "total_amount": 140.47,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38741,
        "date": "2025-01-03",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38742,
        "date": "2025-01-03",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 38743,
        "date": "2025-01-03",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38744,
        "date": "2025-01-03",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38920,
        "date": "2025-01-03",
        "total_amount": 8.52,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39275,
        "date": "2025-01-03",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37707,
        "date": "2025-01-04",
        "total_amount": 60.69,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37433,
        "date": "2025-01-05",
        "total_amount": 390.55,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37693,
        "date": "2025-01-05",
        "total_amount": 5.3,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37702,
        "date": "2025-01-06",
        "total_amount": 123.14,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38719,
        "date": "2025-01-06",
        "total_amount": 2000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38730,
        "date": "2025-01-06",
        "total_amount": 390.55,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38731,
        "date": "2025-01-06",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 38732,
        "date": "2025-01-06",
        "total_amount": 74,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38740,
        "date": "2025-01-06",
        "total_amount": 680.28,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39062,
        "date": "2025-01-06",
        "total_amount": 135.17,
        "transaction_type": "expense",
        "merchant_group_id": 7591,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 6777004 Jonathan Wadsworth"
        }
      },
      {
        "id": 39274,
        "date": "2025-01-06",
        "total_amount": 2000,
        "transaction_type": "income",
        "merchant_group_id": 7397,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 40010,
        "date": "2025-01-06",
        "total_amount": 10.44,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38729,
        "date": "2025-01-07",
        "total_amount": 74,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38737,
        "date": "2025-01-07",
        "total_amount": 110.86,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39523,
        "date": "2025-01-07",
        "total_amount": 1400,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 37431,
        "date": "2025-01-08",
        "total_amount": 28.6,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37432,
        "date": "2025-01-08",
        "total_amount": 39.92,
        "transaction_type": "income",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 37442,
        "date": "2025-01-08",
        "total_amount": 67.86,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37691,
        "date": "2025-01-08",
        "total_amount": 61.78,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39272,
        "date": "2025-01-08",
        "total_amount": 1.5,
        "transaction_type": "expense",
        "merchant_group_id": 7602,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Autoagent Webpayment Wadsworth"
        }
      },
      {
        "id": 39273,
        "date": "2025-01-08",
        "total_amount": 8694.99,
        "transaction_type": "expense",
        "merchant_group_id": 7572,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville Count Echeck Jonathan Wadsworth"
        }
      },
      {
        "id": 37430,
        "date": "2025-01-09",
        "total_amount": 35.93,
        "transaction_type": "income",
        "merchant_group_id": 7377,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Wilson S 5 Cent Greer"
        }
      },
      {
        "id": 37443,
        "date": "2025-01-09",
        "total_amount": 52.28,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38727,
        "date": "2025-01-09",
        "total_amount": 64.28,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38728,
        "date": "2025-01-09",
        "total_amount": 64.28,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37428,
        "date": "2025-01-10",
        "total_amount": 21.5,
        "transaction_type": "income",
        "merchant_group_id": 7428,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Ez Mart 4 Greenville"
        }
      },
      {
        "id": 37429,
        "date": "2025-01-10",
        "total_amount": 7.66,
        "transaction_type": "income",
        "merchant_group_id": 7536,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Tractor Supply 747 Greer"
        }
      },
      {
        "id": 38726,
        "date": "2025-01-10",
        "total_amount": 4157.05,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37439,
        "date": "2025-01-11",
        "total_amount": 46.38,
        "transaction_type": "income",
        "merchant_group_id": 7433,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Cook Out"
        }
      },
      {
        "id": 37440,
        "date": "2025-01-11",
        "total_amount": 4.95,
        "transaction_type": "income",
        "merchant_group_id": 7433,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Cook Out"
        }
      },
      {
        "id": 37690,
        "date": "2025-01-11",
        "total_amount": 269.79,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37703,
        "date": "2025-01-11",
        "total_amount": 123.14,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37427,
        "date": "2025-01-12",
        "total_amount": 980.84,
        "transaction_type": "income",
        "merchant_group_id": 7543,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Big Fish Rentals"
        }
      },
      {
        "id": 37445,
        "date": "2025-01-12",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7342,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Spinx"
        }
      },
      {
        "id": 37426,
        "date": "2025-01-13",
        "total_amount": 33.91,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37438,
        "date": "2025-01-13",
        "total_amount": 5.93,
        "transaction_type": "income",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37441,
        "date": "2025-01-13",
        "total_amount": 29.24,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37689,
        "date": "2025-01-13",
        "total_amount": 520.37,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38723,
        "date": "2025-01-13",
        "total_amount": 455.85,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 38724,
        "date": "2025-01-13",
        "total_amount": 2.5,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 38725,
        "date": "2025-01-13",
        "total_amount": 80,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38736,
        "date": "2025-01-13",
        "total_amount": 70,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39289,
        "date": "2025-01-13",
        "total_amount": 1928.34,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37424,
        "date": "2025-01-14",
        "total_amount": 6.99,
        "transaction_type": "income",
        "merchant_group_id": 7363,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Food Lion"
        }
      },
      {
        "id": 37425,
        "date": "2025-01-14",
        "total_amount": 650,
        "transaction_type": "income",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38721,
        "date": "2025-01-14",
        "total_amount": 1500,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 38722,
        "date": "2025-01-14",
        "total_amount": 3974.18,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38936,
        "date": "2025-01-14",
        "total_amount": 10.44,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39271,
        "date": "2025-01-14",
        "total_amount": 520.37,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39293,
        "date": "2025-01-14",
        "total_amount": 2844,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37437,
        "date": "2025-01-15",
        "total_amount": 2.7,
        "transaction_type": "income",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37688,
        "date": "2025-01-15",
        "total_amount": 2.43,
        "transaction_type": "income",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 38720,
        "date": "2025-01-15",
        "total_amount": 168.15,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38875,
        "date": "2025-01-15",
        "total_amount": 21415.99,
        "transaction_type": "income",
        "merchant_group_id": 7369,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cash Withdrawal In Branch"
        }
      },
      {
        "id": 37423,
        "date": "2025-01-16",
        "total_amount": 46,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": undefined
      },
      {
        "id": 37444,
        "date": "2025-01-16",
        "total_amount": 6.47,
        "transaction_type": "income",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38855,
        "date": "2025-01-16",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7336,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Monthly Service Fee"
        }
      },
      {
        "id": 37360,
        "date": "2025-01-17",
        "total_amount": 16.18,
        "transaction_type": "income",
        "merchant_group_id": 7546,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Coldstone"
        }
      },
      {
        "id": 39270,
        "date": "2025-01-17",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37358,
        "date": "2025-01-18",
        "total_amount": 25.56,
        "transaction_type": "income",
        "merchant_group_id": 7379,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Culvers"
        }
      },
      {
        "id": 37359,
        "date": "2025-01-18",
        "total_amount": 96.65,
        "transaction_type": "income",
        "merchant_group_id": 7391,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Target Taylors"
        }
      },
      {
        "id": 38935,
        "date": "2025-01-19",
        "total_amount": 10.44,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37361,
        "date": "2025-01-20",
        "total_amount": 0.27,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": undefined
      },
      {
        "id": 37367,
        "date": "2025-01-20",
        "total_amount": 24.6,
        "transaction_type": "income",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37687,
        "date": "2025-01-21",
        "total_amount": 54.99,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38718,
        "date": "2025-01-21",
        "total_amount": 20417.78,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 38781,
        "date": "2025-01-21",
        "total_amount": 10.16,
        "transaction_type": "income",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 39269,
        "date": "2025-01-21",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39910,
        "date": "2025-01-21",
        "total_amount": 957.86,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37362,
        "date": "2025-01-22",
        "total_amount": 19.57,
        "transaction_type": "income",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 39018,
        "date": "2025-01-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39019,
        "date": "2025-01-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39267,
        "date": "2025-01-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39268,
        "date": "2025-01-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39283,
        "date": "2025-01-22",
        "total_amount": 1883.93,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38823,
        "date": "2025-01-23",
        "total_amount": 18.02,
        "transaction_type": "income",
        "merchant_group_id": 7452,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "76 Petroleum"
        }
      },
      {
        "id": 37353,
        "date": "2025-01-24",
        "total_amount": 22.8,
        "transaction_type": "income",
        "merchant_group_id": 7289,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Usps"
        }
      },
      {
        "id": 37354,
        "date": "2025-01-24",
        "total_amount": 25.91,
        "transaction_type": "income",
        "merchant_group_id": 7371,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Papa Johns"
        }
      },
      {
        "id": 37355,
        "date": "2025-01-24",
        "total_amount": 1.32,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37364,
        "date": "2025-01-24",
        "total_amount": 16.21,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38717,
        "date": "2025-01-24",
        "total_amount": 4124.36,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37351,
        "date": "2025-01-25",
        "total_amount": 37.09,
        "transaction_type": "income",
        "merchant_group_id": 7391,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Target Taylors"
        }
      },
      {
        "id": 37352,
        "date": "2025-01-25",
        "total_amount": 4.31,
        "transaction_type": "income",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37363,
        "date": "2025-01-25",
        "total_amount": 22.23,
        "transaction_type": "income",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37371,
        "date": "2025-01-26",
        "total_amount": 17.8,
        "transaction_type": "income",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37369,
        "date": "2025-01-27",
        "total_amount": 6.89,
        "transaction_type": "income",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 39284,
        "date": "2025-01-27",
        "total_amount": 1015.59,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37350,
        "date": "2025-01-30",
        "total_amount": 23.54,
        "transaction_type": "income",
        "merchant_group_id": 7362,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chipotle"
        }
      },
      {
        "id": 38715,
        "date": "2025-01-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38716,
        "date": "2025-01-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39266,
        "date": "2025-01-30",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37349,
        "date": "2025-01-31",
        "total_amount": 84.79,
        "transaction_type": "income",
        "merchant_group_id": 7544,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Chess.com"
        }
      },
      {
        "id": 37372,
        "date": "2025-01-31",
        "total_amount": 8.69,
        "transaction_type": "income",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38873,
        "date": "2025-01-31",
        "total_amount": 177.06,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37334,
        "date": "2025-02-01",
        "total_amount": 35.58,
        "transaction_type": "income",
        "merchant_group_id": 7550,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Hungry Howies"
        }
      },
      {
        "id": 38919,
        "date": "2025-02-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38931,
        "date": "2025-02-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39898,
        "date": "2025-02-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37366,
        "date": "2025-02-02",
        "total_amount": 25.2,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38872,
        "date": "2025-02-02",
        "total_amount": 6.86,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39882,
        "date": "2025-02-02",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37333,
        "date": "2025-02-03",
        "total_amount": 68.47,
        "transaction_type": "income",
        "merchant_group_id": 7504,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Red Lobster"
        }
      },
      {
        "id": 37365,
        "date": "2025-02-03",
        "total_amount": 16.14,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38371,
        "date": "2025-02-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38713,
        "date": "2025-02-03",
        "total_amount": 36.59,
        "transaction_type": "income",
        "merchant_group_id": 7307,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 38714,
        "date": "2025-02-03",
        "total_amount": 81,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38733,
        "date": "2025-02-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38820,
        "date": "2025-02-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38830,
        "date": "2025-02-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38918,
        "date": "2025-02-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39265,
        "date": "2025-02-03",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 38709,
        "date": "2025-02-04",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38710,
        "date": "2025-02-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 38711,
        "date": "2025-02-04",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38712,
        "date": "2025-02-04",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39291,
        "date": "2025-02-04",
        "total_amount": 957.86,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37332,
        "date": "2025-02-05",
        "total_amount": 42.15,
        "transaction_type": "income",
        "merchant_group_id": 7414,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Speedway"
        }
      },
      {
        "id": 37368,
        "date": "2025-02-05",
        "total_amount": 37.32,
        "transaction_type": "income",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37370,
        "date": "2025-02-05",
        "total_amount": 4.3,
        "transaction_type": "income",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38708,
        "date": "2025-02-05",
        "total_amount": 2901.73,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37685,
        "date": "2025-02-06",
        "total_amount": 14.83,
        "transaction_type": "income",
        "merchant_group_id": 7413,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Classic Ace Hardware"
        }
      },
      {
        "id": 37686,
        "date": "2025-02-06",
        "total_amount": 41.43,
        "transaction_type": "income",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37705,
        "date": "2025-02-06",
        "total_amount": 15.56,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37706,
        "date": "2025-02-06",
        "total_amount": 356.16,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39264,
        "date": "2025-02-06",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38707,
        "date": "2025-02-07",
        "total_amount": 4124.36,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39522,
        "date": "2025-02-07",
        "total_amount": 665.2,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37321,
        "date": "2025-02-08",
        "total_amount": 77.4,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37684,
        "date": "2025-02-08",
        "total_amount": 212.45,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37319,
        "date": "2025-02-10",
        "total_amount": 2719.03,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37683,
        "date": "2025-02-10",
        "total_amount": 635.27,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38706,
        "date": "2025-02-10",
        "total_amount": 78.3,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38738,
        "date": "2025-02-10",
        "total_amount": 275.36,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38854,
        "date": "2025-02-10",
        "total_amount": 161.73,
        "transaction_type": "expense",
        "merchant_group_id": 7394,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0r8pv96d To Signify Business Essent..."
        }
      },
      {
        "id": 38917,
        "date": "2025-02-10",
        "total_amount": 161.73,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39263,
        "date": "2025-02-10",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37682,
        "date": "2025-02-11",
        "total_amount": 381.29,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38703,
        "date": "2025-02-11",
        "total_amount": 78.3,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38704,
        "date": "2025-02-11",
        "total_amount": 2719.03,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38705,
        "date": "2025-02-11",
        "total_amount": 3853.81,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39262,
        "date": "2025-02-11",
        "total_amount": 635.27,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39286,
        "date": "2025-02-11",
        "total_amount": 1031.11,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39292,
        "date": "2025-02-13",
        "total_amount": 2694,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38702,
        "date": "2025-02-14",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37318,
        "date": "2025-02-15",
        "total_amount": 25.82,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37317,
        "date": "2025-02-16",
        "total_amount": 10.75,
        "transaction_type": "income",
        "merchant_group_id": 7480,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Cheesecake Factory"
        }
      },
      {
        "id": 38916,
        "date": "2025-02-16",
        "total_amount": 105.99,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 37322,
        "date": "2025-02-18",
        "total_amount": 17.75,
        "transaction_type": "income",
        "merchant_group_id": 7452,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "76 Petroleum"
        }
      },
      {
        "id": 38853,
        "date": "2025-02-18",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7336,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Monthly Service Fee"
        }
      },
      {
        "id": 37316,
        "date": "2025-02-19",
        "total_amount": 170.64,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37681,
        "date": "2025-02-19",
        "total_amount": 74.19,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39261,
        "date": "2025-02-19",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38701,
        "date": "2025-02-20",
        "total_amount": 261.87,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 37324,
        "date": "2025-02-21",
        "total_amount": 2.64,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37680,
        "date": "2025-02-21",
        "total_amount": 172.51,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38700,
        "date": "2025-02-21",
        "total_amount": 4255.33,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39521,
        "date": "2025-02-21",
        "total_amount": 804.76,
        "transaction_type": "expense",
        "merchant_group_id": 7508,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Truist"
        }
      },
      {
        "id": 37314,
        "date": "2025-02-22",
        "total_amount": 3.38,
        "transaction_type": "income",
        "merchant_group_id": 7381,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Big Lots"
        }
      },
      {
        "id": 37315,
        "date": "2025-02-22",
        "total_amount": 2.37,
        "transaction_type": "income",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37313,
        "date": "2025-02-23",
        "total_amount": 99.96,
        "transaction_type": "income",
        "merchant_group_id": 7505,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Red Robin"
        }
      },
      {
        "id": 37325,
        "date": "2025-02-24",
        "total_amount": 5.39,
        "transaction_type": "income",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 39016,
        "date": "2025-02-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39017,
        "date": "2025-02-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39258,
        "date": "2025-02-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39259,
        "date": "2025-02-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39260,
        "date": "2025-02-24",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39282,
        "date": "2025-02-24",
        "total_amount": 974.85,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37312,
        "date": "2025-02-25",
        "total_amount": 106.55,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37311,
        "date": "2025-02-26",
        "total_amount": 14.8,
        "transaction_type": "income",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37309,
        "date": "2025-02-28",
        "total_amount": 7.34,
        "transaction_type": "income",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 37310,
        "date": "2025-02-28",
        "total_amount": 24.31,
        "transaction_type": "income",
        "merchant_group_id": 7331,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "The Original Harveys Family Restaurant"
        }
      },
      {
        "id": 37326,
        "date": "2025-02-28",
        "total_amount": 19.63,
        "transaction_type": "income",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 39061,
        "date": "2025-02-28",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 40030,
        "date": "2025-02-28",
        "total_amount": 321.5,
        "transaction_type": "expense",
        "merchant_group_id": 7301,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Optavia"
        }
      },
      {
        "id": 38915,
        "date": "2025-03-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38930,
        "date": "2025-03-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39897,
        "date": "2025-03-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37305,
        "date": "2025-03-02",
        "total_amount": 3.24,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37306,
        "date": "2025-03-02",
        "total_amount": 250,
        "transaction_type": "income",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 37307,
        "date": "2025-03-02",
        "total_amount": 50.89,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37308,
        "date": "2025-03-02",
        "total_amount": 21.6,
        "transaction_type": "income",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 38734,
        "date": "2025-03-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38735,
        "date": "2025-03-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38819,
        "date": "2025-03-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38838,
        "date": "2025-03-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38914,
        "date": "2025-03-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39257,
        "date": "2025-03-03",
        "total_amount": 624.58,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39881,
        "date": "2025-03-03",
        "total_amount": 0.57,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38410,
        "date": "2025-03-04",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38411,
        "date": "2025-03-04",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38412,
        "date": "2025-03-04",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38413,
        "date": "2025-03-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 38414,
        "date": "2025-03-04",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38415,
        "date": "2025-03-04",
        "total_amount": 400,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38699,
        "date": "2025-03-04",
        "total_amount": 156,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38409,
        "date": "2025-03-05",
        "total_amount": 2980.46,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37302,
        "date": "2025-03-06",
        "total_amount": 15.8,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37303,
        "date": "2025-03-06",
        "total_amount": 5.16,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37304,
        "date": "2025-03-06",
        "total_amount": 37.89,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38934,
        "date": "2025-03-06",
        "total_amount": 10.44,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37679,
        "date": "2025-03-07",
        "total_amount": 90,
        "transaction_type": "income",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 38408,
        "date": "2025-03-07",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38407,
        "date": "2025-03-10",
        "total_amount": 135,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39256,
        "date": "2025-03-10",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39287,
        "date": "2025-03-10",
        "total_amount": 1382.25,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37301,
        "date": "2025-03-11",
        "total_amount": 1086.36,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37677,
        "date": "2025-03-11",
        "total_amount": 1268.42,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37678,
        "date": "2025-03-11",
        "total_amount": 286.36,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38336,
        "date": "2025-03-11",
        "total_amount": 73.07,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38851,
        "date": "2025-03-11",
        "total_amount": 105.99,
        "transaction_type": "expense",
        "merchant_group_id": 7399,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0rlwbvjk To Signify Business Essent..."
        }
      },
      {
        "id": 38913,
        "date": "2025-03-11",
        "total_amount": 105.99,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39863,
        "date": "2025-03-11",
        "total_amount": 2290.17,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38405,
        "date": "2025-03-12",
        "total_amount": 1086.36,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38406,
        "date": "2025-03-12",
        "total_amount": 2430.98,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39242,
        "date": "2025-03-12",
        "total_amount": 1268.42,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39254,
        "date": "2025-03-12",
        "total_amount": 2844,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38404,
        "date": "2025-03-13",
        "total_amount": 250,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 38403,
        "date": "2025-03-14",
        "total_amount": 50,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 37676,
        "date": "2025-03-15",
        "total_amount": 26.5,
        "transaction_type": "income",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 38850,
        "date": "2025-03-17",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7336,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Monthly Service Fee"
        }
      },
      {
        "id": 39241,
        "date": "2025-03-17",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39249,
        "date": "2025-03-18",
        "total_amount": 2134,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38401,
        "date": "2025-03-19",
        "total_amount": 19.79,
        "transaction_type": "income",
        "merchant_group_id": 7541,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wells Fargo Rewards"
        }
      },
      {
        "id": 38402,
        "date": "2025-03-19",
        "total_amount": 199.86,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 37299,
        "date": "2025-03-20",
        "total_amount": 2.15,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37300,
        "date": "2025-03-20",
        "total_amount": 94.09,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38400,
        "date": "2025-03-20",
        "total_amount": 62.85,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37674,
        "date": "2025-03-21",
        "total_amount": 172.51,
        "transaction_type": "income",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37675,
        "date": "2025-03-21",
        "total_amount": 117.52,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38399,
        "date": "2025-03-21",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39520,
        "date": "2025-03-21",
        "total_amount": 804.76,
        "transaction_type": "expense",
        "merchant_group_id": 7508,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Truist"
        }
      },
      {
        "id": 39001,
        "date": "2025-03-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39015,
        "date": "2025-03-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39060,
        "date": "2025-03-24",
        "total_amount": 125.82,
        "transaction_type": "income",
        "merchant_group_id": 7583,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "T Pcs Svc 5483116 47 Killarney Ln"
        }
      },
      {
        "id": 39239,
        "date": "2025-03-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39240,
        "date": "2025-03-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38395,
        "date": "2025-03-25",
        "total_amount": 1289.2,
        "transaction_type": "income",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 38396,
        "date": "2025-03-25",
        "total_amount": 29000,
        "transaction_type": "income",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38416,
        "date": "2025-03-25",
        "total_amount": 1205,
        "transaction_type": "expense",
        "merchant_group_id": 7341,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roots Real Estate"
        }
      },
      {
        "id": 38862,
        "date": "2025-03-25",
        "total_amount": 7000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39237,
        "date": "2025-03-25",
        "total_amount": 7000,
        "transaction_type": "expense",
        "merchant_group_id": 7398,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39238,
        "date": "2025-03-25",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38394,
        "date": "2025-03-26",
        "total_amount": 141.28,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 38933,
        "date": "2025-03-26",
        "total_amount": 31.32,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37529,
        "date": "2025-03-27",
        "total_amount": 33822.04,
        "transaction_type": "expense",
        "merchant_group_id": 7508,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Truist"
        }
      },
      {
        "id": 37530,
        "date": "2025-03-27",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 37708,
        "date": "2025-03-30",
        "total_amount": 25.5,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37672,
        "date": "2025-03-31",
        "total_amount": 10.78,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37673,
        "date": "2025-03-31",
        "total_amount": 99.3,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39000,
        "date": "2025-03-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39236,
        "date": "2025-03-31",
        "total_amount": 275,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39246,
        "date": "2025-03-31",
        "total_amount": 936.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39896,
        "date": "2025-03-31",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37524,
        "date": "2025-04-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37526,
        "date": "2025-04-01",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37527,
        "date": "2025-04-01",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37528,
        "date": "2025-04-01",
        "total_amount": 160,
        "transaction_type": "expense",
        "merchant_group_id": 7384,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Passport Services"
        }
      },
      {
        "id": 38102,
        "date": "2025-04-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38335,
        "date": "2025-04-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38829,
        "date": "2025-04-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38861,
        "date": "2025-04-01",
        "total_amount": 3150,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38927,
        "date": "2025-04-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38929,
        "date": "2025-04-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39234,
        "date": "2025-04-01",
        "total_amount": 3150,
        "transaction_type": "expense",
        "merchant_group_id": 7538,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0ptvj6j6 Everyday Ch..."
        }
      },
      {
        "id": 39235,
        "date": "2025-04-01",
        "total_amount": 610.93,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39248,
        "date": "2025-04-01",
        "total_amount": 1951.64,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37525,
        "date": "2025-04-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 37532,
        "date": "2025-04-02",
        "total_amount": 6878,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38912,
        "date": "2025-04-02",
        "total_amount": 88.19,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39059,
        "date": "2025-04-02",
        "total_amount": 88.19,
        "transaction_type": "expense",
        "merchant_group_id": 7517,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0s6k63d7 To Signify Business Essent..."
        }
      },
      {
        "id": 39233,
        "date": "2025-04-02",
        "total_amount": 6878,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 37298,
        "date": "2025-04-03",
        "total_amount": 505.13,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38911,
        "date": "2025-04-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39519,
        "date": "2025-04-03",
        "total_amount": 6878,
        "transaction_type": "expense",
        "merchant_group_id": 7519,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Irs Usataxpymt Jonathan R Heather A"
        }
      },
      {
        "id": 37520,
        "date": "2025-04-04",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37521,
        "date": "2025-04-04",
        "total_amount": 505.13,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 37522,
        "date": "2025-04-04",
        "total_amount": 3418.71,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37523,
        "date": "2025-04-04",
        "total_amount": 81,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39232,
        "date": "2025-04-04",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37519,
        "date": "2025-04-07",
        "total_amount": 2980.46,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37531,
        "date": "2025-04-07",
        "total_amount": 20,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37294,
        "date": "2025-04-08",
        "total_amount": 58.24,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37295,
        "date": "2025-04-08",
        "total_amount": 14.2,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37296,
        "date": "2025-04-08",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7404,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Doordash"
        }
      },
      {
        "id": 37297,
        "date": "2025-04-08",
        "total_amount": 3.01,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37671,
        "date": "2025-04-08",
        "total_amount": 30.7,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39231,
        "date": "2025-04-08",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39244,
        "date": "2025-04-08",
        "total_amount": 1373.52,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37670,
        "date": "2025-04-10",
        "total_amount": 555.2,
        "transaction_type": "income",
        "merchant_group_id": 7408,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Jeff Lynch Appliance Center"
        }
      },
      {
        "id": 37533,
        "date": "2025-04-11",
        "total_amount": 3500,
        "transaction_type": "income",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37669,
        "date": "2025-04-11",
        "total_amount": 309.39,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37292,
        "date": "2025-04-13",
        "total_amount": 88.26,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37293,
        "date": "2025-04-13",
        "total_amount": 10.77,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37517,
        "date": "2025-04-14",
        "total_amount": 7246.52,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 39247,
        "date": "2025-04-14",
        "total_amount": 1362.85,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39252,
        "date": "2025-04-14",
        "total_amount": 2154,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39518,
        "date": "2025-04-14",
        "total_amount": 838,
        "transaction_type": "income",
        "merchant_group_id": 7568,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sc State Treasur Tax Refund R440 Jonathan Wadswort..."
        }
      },
      {
        "id": 38849,
        "date": "2025-04-15",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7336,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Monthly Service Fee"
        }
      },
      {
        "id": 39517,
        "date": "2025-04-15",
        "total_amount": 1900,
        "transaction_type": "expense",
        "merchant_group_id": 7519,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Irs Usataxpymt Jonathan R Heather A"
        }
      },
      {
        "id": 39528,
        "date": "2025-04-15",
        "total_amount": 1928.13,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37516,
        "date": "2025-04-16",
        "total_amount": 148.18,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 37668,
        "date": "2025-04-16",
        "total_amount": 593.43,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39230,
        "date": "2025-04-16",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39229,
        "date": "2025-04-17",
        "total_amount": 593.43,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 37515,
        "date": "2025-04-18",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37512,
        "date": "2025-04-21",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37513,
        "date": "2025-04-21",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37514,
        "date": "2025-04-21",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39250,
        "date": "2025-04-21",
        "total_amount": 1613.11,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37288,
        "date": "2025-04-22",
        "total_amount": 7.55,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37289,
        "date": "2025-04-22",
        "total_amount": 23.29,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37290,
        "date": "2025-04-22",
        "total_amount": 20.29,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37291,
        "date": "2025-04-22",
        "total_amount": 16,
        "transaction_type": "income",
        "merchant_group_id": 7312,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Fins Car Wash"
        }
      },
      {
        "id": 38848,
        "date": "2025-04-22",
        "total_amount": 650,
        "transaction_type": "income",
        "merchant_group_id": 7373,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Brand Leader The Brand Leader Paying Bill Via..."
        }
      },
      {
        "id": 38998,
        "date": "2025-04-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38999,
        "date": "2025-04-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39227,
        "date": "2025-04-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39228,
        "date": "2025-04-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 37510,
        "date": "2025-04-25",
        "total_amount": 13,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37511,
        "date": "2025-04-25",
        "total_amount": 20,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39226,
        "date": "2025-04-25",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38910,
        "date": "2025-04-27",
        "total_amount": 45.86,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38847,
        "date": "2025-04-28",
        "total_amount": 45.86,
        "transaction_type": "expense",
        "merchant_group_id": 7517,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0s6k63d7 To Signify Business Essent..."
        }
      },
      {
        "id": 37284,
        "date": "2025-04-29",
        "total_amount": 111.06,
        "transaction_type": "income",
        "merchant_group_id": 7417,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Airbnb"
        }
      },
      {
        "id": 37285,
        "date": "2025-04-29",
        "total_amount": 68.56,
        "transaction_type": "income",
        "merchant_group_id": 7429,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Sncf Voyageurs Roissy"
        }
      },
      {
        "id": 37286,
        "date": "2025-04-29",
        "total_amount": 20.57,
        "transaction_type": "income",
        "merchant_group_id": 7422,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Ratp Paris"
        }
      },
      {
        "id": 37287,
        "date": "2025-04-29",
        "total_amount": 66.73,
        "transaction_type": "income",
        "merchant_group_id": 7378,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Berliner Das Ori Paris"
        }
      },
      {
        "id": 39225,
        "date": "2025-04-29",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39251,
        "date": "2025-04-29",
        "total_amount": 1308.53,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37280,
        "date": "2025-04-30",
        "total_amount": 571.45,
        "transaction_type": "income",
        "merchant_group_id": 7524,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Eurostar International Li Paris"
        }
      },
      {
        "id": 37281,
        "date": "2025-04-30",
        "total_amount": 12.11,
        "transaction_type": "income",
        "merchant_group_id": 7532,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Colisee Gourmet Paris"
        }
      },
      {
        "id": 37282,
        "date": "2025-04-30",
        "total_amount": 11.43,
        "transaction_type": "income",
        "merchant_group_id": 7422,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Ratp Paris"
        }
      },
      {
        "id": 37283,
        "date": "2025-04-30",
        "total_amount": 6.51,
        "transaction_type": "income",
        "merchant_group_id": 7532,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Colisee Gourmet Paris"
        }
      },
      {
        "id": 37508,
        "date": "2025-04-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37509,
        "date": "2025-04-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39058,
        "date": "2025-04-30",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 37518,
        "date": "2025-05-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38101,
        "date": "2025-05-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38276,
        "date": "2025-05-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38813,
        "date": "2025-05-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38907,
        "date": "2025-05-01",
        "total_amount": 84.5,
        "transaction_type": "income",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38908,
        "date": "2025-05-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38909,
        "date": "2025-05-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38922,
        "date": "2025-05-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39224,
        "date": "2025-05-01",
        "total_amount": 610.93,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 38510,
        "date": "2025-05-02",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38511,
        "date": "2025-05-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 38906,
        "date": "2025-05-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 38141,
        "date": "2025-05-04",
        "total_amount": 40,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37323,
        "date": "2025-05-05",
        "total_amount": 9.88,
        "transaction_type": "income",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38140,
        "date": "2025-05-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 38509,
        "date": "2025-05-05",
        "total_amount": 2980.46,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37279,
        "date": "2025-05-06",
        "total_amount": 8.07,
        "transaction_type": "income",
        "merchant_group_id": 7547,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Crf Market Zaventem"
        }
      },
      {
        "id": 38846,
        "date": "2025-05-06",
        "total_amount": 1100,
        "transaction_type": "income",
        "merchant_group_id": 7373,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Brand Leader The Brand Leader Paying Bill Via..."
        }
      },
      {
        "id": 37278,
        "date": "2025-05-07",
        "total_amount": 2.28,
        "transaction_type": "income",
        "merchant_group_id": 7407,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Ikea"
        }
      },
      {
        "id": 38137,
        "date": "2025-05-07",
        "total_amount": 6.33,
        "transaction_type": "expense",
        "merchant_group_id": 7436,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Good and the Beautiful"
        }
      },
      {
        "id": 38825,
        "date": "2025-05-07",
        "total_amount": 5.27,
        "transaction_type": "income",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38682,
        "date": "2025-05-08",
        "total_amount": 18.21,
        "transaction_type": "income",
        "merchant_group_id": 7423,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Musea Brugge Brugge"
        }
      },
      {
        "id": 38683,
        "date": "2025-05-08",
        "total_amount": 16.16,
        "transaction_type": "income",
        "merchant_group_id": 7339,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Old Chocolate House Brugge"
        }
      },
      {
        "id": 38135,
        "date": "2025-05-09",
        "total_amount": 12.23,
        "transaction_type": "expense",
        "merchant_group_id": 7460,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mint Mobile"
        }
      },
      {
        "id": 38136,
        "date": "2025-05-09",
        "total_amount": 12.23,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38681,
        "date": "2025-05-09",
        "total_amount": 28.61,
        "transaction_type": "income",
        "merchant_group_id": 7403,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Albert Heijn"
        }
      },
      {
        "id": 38824,
        "date": "2025-05-10",
        "total_amount": 6.06,
        "transaction_type": "income",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38677,
        "date": "2025-05-11",
        "total_amount": 28.24,
        "transaction_type": "income",
        "merchant_group_id": 7522,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Kerkfabriek Sint Baafs Gent"
        }
      },
      {
        "id": 38678,
        "date": "2025-05-11",
        "total_amount": 5.08,
        "transaction_type": "income",
        "merchant_group_id": 7374,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Parking Ramen Gent"
        }
      },
      {
        "id": 37667,
        "date": "2025-05-11",
        "total_amount": 230.54,
        "transaction_type": "income",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38679,
        "date": "2025-05-11",
        "total_amount": 20.33,
        "transaction_type": "income",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 38660,
        "date": "2025-05-12",
        "total_amount": 23.74,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38662,
        "date": "2025-05-12",
        "total_amount": 22,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 38675,
        "date": "2025-05-12",
        "total_amount": 4.07,
        "transaction_type": "income",
        "merchant_group_id": 7380,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Autogrill Vending Zaventem"
        }
      },
      {
        "id": 38692,
        "date": "2025-05-12",
        "total_amount": 24.78,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38693,
        "date": "2025-05-12",
        "total_amount": 233.19,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39223,
        "date": "2025-05-12",
        "total_amount": 3612.48,
        "transaction_type": "expense",
        "merchant_group_id": 7412,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Proper Insurance"
        }
      },
      {
        "id": 39243,
        "date": "2025-05-12",
        "total_amount": 1658.7,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38134,
        "date": "2025-05-13",
        "total_amount": 98.53,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38658,
        "date": "2025-05-13",
        "total_amount": 21.58,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38659,
        "date": "2025-05-13",
        "total_amount": 93.27,
        "transaction_type": "expense",
        "merchant_group_id": 7455,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Best Buy"
        }
      },
      {
        "id": 39222,
        "date": "2025-05-13",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39255,
        "date": "2025-05-13",
        "total_amount": 1890,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37666,
        "date": "2025-05-14",
        "total_amount": 249.08,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38651,
        "date": "2025-05-14",
        "total_amount": 1.25,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38652,
        "date": "2025-05-14",
        "total_amount": 41.05,
        "transaction_type": "expense",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 38673,
        "date": "2025-05-14",
        "total_amount": 22.76,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38508,
        "date": "2025-05-15",
        "total_amount": 101.6,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38661,
        "date": "2025-05-15",
        "total_amount": 48.46,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38507,
        "date": "2025-05-16",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38649,
        "date": "2025-05-16",
        "total_amount": 24.33,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38650,
        "date": "2025-05-16",
        "total_amount": 28.67,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39253,
        "date": "2025-05-16",
        "total_amount": 764,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37665,
        "date": "2025-05-17",
        "total_amount": 895.29,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38647,
        "date": "2025-05-17",
        "total_amount": 3546.2,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38648,
        "date": "2025-05-17",
        "total_amount": 19.69,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38664,
        "date": "2025-05-17",
        "total_amount": 17.49,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 38671,
        "date": "2025-05-17",
        "total_amount": 41.48,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38672,
        "date": "2025-05-17",
        "total_amount": 1135.03,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38504,
        "date": "2025-05-19",
        "total_amount": 243.42,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 38505,
        "date": "2025-05-19",
        "total_amount": 1135.03,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38506,
        "date": "2025-05-19",
        "total_amount": 3546.2,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38645,
        "date": "2025-05-19",
        "total_amount": 3.66,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 38646,
        "date": "2025-05-19",
        "total_amount": 9.82,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 39221,
        "date": "2025-05-19",
        "total_amount": 895.29,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38643,
        "date": "2025-05-20",
        "total_amount": 5.76,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38644,
        "date": "2025-05-20",
        "total_amount": 27.26,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38863,
        "date": "2025-05-20",
        "total_amount": 7000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39219,
        "date": "2025-05-20",
        "total_amount": 7000,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 39220,
        "date": "2025-05-20",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39245,
        "date": "2025-05-20",
        "total_amount": 1275.06,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37320,
        "date": "2025-05-21",
        "total_amount": 6.04,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37694,
        "date": "2025-05-21",
        "total_amount": 26.45,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38639,
        "date": "2025-05-21",
        "total_amount": 70.13,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38640,
        "date": "2025-05-21",
        "total_amount": 5.28,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38641,
        "date": "2025-05-21",
        "total_amount": 28.48,
        "transaction_type": "expense",
        "merchant_group_id": 7478,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Applebees"
        }
      },
      {
        "id": 38642,
        "date": "2025-05-21",
        "total_amount": 17.61,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38636,
        "date": "2025-05-22",
        "total_amount": 13.26,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38637,
        "date": "2025-05-22",
        "total_amount": 38.2,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 38638,
        "date": "2025-05-22",
        "total_amount": 43.07,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38663,
        "date": "2025-05-22",
        "total_amount": 13.02,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38996,
        "date": "2025-05-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38997,
        "date": "2025-05-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39217,
        "date": "2025-05-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39218,
        "date": "2025-05-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38633,
        "date": "2025-05-23",
        "total_amount": 3.05,
        "transaction_type": "expense",
        "merchant_group_id": 7459,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Foods"
        }
      },
      {
        "id": 38634,
        "date": "2025-05-23",
        "total_amount": 8.69,
        "transaction_type": "expense",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 38635,
        "date": "2025-05-23",
        "total_amount": 46.4,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38657,
        "date": "2025-05-23",
        "total_amount": 27.95,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38632,
        "date": "2025-05-24",
        "total_amount": 2.16,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38654,
        "date": "2025-05-26",
        "total_amount": 4.31,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38503,
        "date": "2025-05-27",
        "total_amount": 944.05,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 38627,
        "date": "2025-05-27",
        "total_amount": 5.47,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 38628,
        "date": "2025-05-27",
        "total_amount": 15.84,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 38629,
        "date": "2025-05-27",
        "total_amount": 39.99,
        "transaction_type": "expense",
        "merchant_group_id": 7434,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Autobell Car Wash"
        }
      },
      {
        "id": 38630,
        "date": "2025-05-27",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7297,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Power Homeschool"
        }
      },
      {
        "id": 38631,
        "date": "2025-05-27",
        "total_amount": 21.44,
        "transaction_type": "expense",
        "merchant_group_id": 7461,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mr Salsa"
        }
      },
      {
        "id": 39216,
        "date": "2025-05-27",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37692,
        "date": "2025-05-28",
        "total_amount": 49.79,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38622,
        "date": "2025-05-28",
        "total_amount": 93.27,
        "transaction_type": "income",
        "merchant_group_id": 7455,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Best Buy"
        }
      },
      {
        "id": 38623,
        "date": "2025-05-28",
        "total_amount": 4.74,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38624,
        "date": "2025-05-28",
        "total_amount": 32.65,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38625,
        "date": "2025-05-28",
        "total_amount": 26.7,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38626,
        "date": "2025-05-28",
        "total_amount": 46.17,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38670,
        "date": "2025-05-28",
        "total_amount": 15,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38695,
        "date": "2025-05-28",
        "total_amount": 3.01,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38696,
        "date": "2025-05-28",
        "total_amount": 76.9,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39866,
        "date": "2025-05-28",
        "total_amount": 1981.71,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38512,
        "date": "2025-05-29",
        "total_amount": 355,
        "transaction_type": "expense",
        "merchant_group_id": 7341,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roots Real Estate"
        }
      },
      {
        "id": 38617,
        "date": "2025-05-29",
        "total_amount": 24.1,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38618,
        "date": "2025-05-29",
        "total_amount": 651.27,
        "transaction_type": "expense",
        "merchant_group_id": 7435,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Certified Automotive"
        }
      },
      {
        "id": 38619,
        "date": "2025-05-29",
        "total_amount": 1,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 38620,
        "date": "2025-05-29",
        "total_amount": 49.77,
        "transaction_type": "expense",
        "merchant_group_id": 7499,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Gabriel Bros"
        }
      },
      {
        "id": 38621,
        "date": "2025-05-29",
        "total_amount": 24.36,
        "transaction_type": "expense",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 38495,
        "date": "2025-05-30",
        "total_amount": 243.52,
        "transaction_type": "income",
        "merchant_group_id": 7300,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 38496,
        "date": "2025-05-30",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38500,
        "date": "2025-05-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38501,
        "date": "2025-05-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38613,
        "date": "2025-05-30",
        "total_amount": 35.92,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 38614,
        "date": "2025-05-30",
        "total_amount": 56.9,
        "transaction_type": "expense",
        "merchant_group_id": 7338,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Express Tire Engineers"
        }
      },
      {
        "id": 38615,
        "date": "2025-05-30",
        "total_amount": 4.96,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38616,
        "date": "2025-05-30",
        "total_amount": 1.78,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38653,
        "date": "2025-05-30",
        "total_amount": 546.1,
        "transaction_type": "expense",
        "merchant_group_id": 7435,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Certified Automotive"
        }
      },
      {
        "id": 38691,
        "date": "2025-05-30",
        "total_amount": 44.02,
        "transaction_type": "expense",
        "merchant_group_id": 7342,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Spinx"
        }
      },
      {
        "id": 38995,
        "date": "2025-05-30",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 37751,
        "date": "2025-05-31",
        "total_amount": 64.87,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38608,
        "date": "2025-05-31",
        "total_amount": 5.27,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38609,
        "date": "2025-05-31",
        "total_amount": 10.48,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38610,
        "date": "2025-05-31",
        "total_amount": 5.19,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38611,
        "date": "2025-05-31",
        "total_amount": 83.56,
        "transaction_type": "expense",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 38612,
        "date": "2025-05-31",
        "total_amount": 16.31,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38655,
        "date": "2025-05-31",
        "total_amount": 3,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38932,
        "date": "2025-05-31",
        "total_amount": 10.44,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38192,
        "date": "2025-06-01",
        "total_amount": 10.78,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 38193,
        "date": "2025-06-01",
        "total_amount": 35.5,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38601,
        "date": "2025-06-01",
        "total_amount": 84,
        "transaction_type": "expense",
        "merchant_group_id": 7486,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "His Radio"
        }
      },
      {
        "id": 38602,
        "date": "2025-06-01",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": 7316,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "WCG Accounting"
        }
      },
      {
        "id": 38603,
        "date": "2025-06-01",
        "total_amount": 511.29,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38604,
        "date": "2025-06-01",
        "total_amount": 2.71,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 38605,
        "date": "2025-06-01",
        "total_amount": 12.47,
        "transaction_type": "expense",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 38606,
        "date": "2025-06-01",
        "total_amount": 21.19,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38607,
        "date": "2025-06-01",
        "total_amount": 12.93,
        "transaction_type": "expense",
        "merchant_group_id": 7433,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cook Out"
        }
      },
      {
        "id": 38656,
        "date": "2025-06-01",
        "total_amount": 4.22,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38921,
        "date": "2025-06-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38926,
        "date": "2025-06-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38928,
        "date": "2025-06-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37594,
        "date": "2025-06-02",
        "total_amount": 5.28,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37695,
        "date": "2025-06-02",
        "total_amount": 555.86,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38103,
        "date": "2025-06-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38242,
        "date": "2025-06-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38478,
        "date": "2025-06-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38571,
        "date": "2025-06-02",
        "total_amount": 1778.87,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38572,
        "date": "2025-06-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7458,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Kirby Sanitation"
        }
      },
      {
        "id": 38698,
        "date": "2025-06-02",
        "total_amount": 583.4,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38812,
        "date": "2025-06-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39200,
        "date": "2025-06-02",
        "total_amount": 610.93,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 37591,
        "date": "2025-06-03",
        "total_amount": 16,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37592,
        "date": "2025-06-03",
        "total_amount": 66.91,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 37593,
        "date": "2025-06-03",
        "total_amount": 93.43,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38493,
        "date": "2025-06-03",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 38494,
        "date": "2025-06-03",
        "total_amount": 1778.87,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38575,
        "date": "2025-06-03",
        "total_amount": 9.82,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38905,
        "date": "2025-06-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 37586,
        "date": "2025-06-04",
        "total_amount": 49.77,
        "transaction_type": "income",
        "merchant_group_id": 7499,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Gabriel Bros"
        }
      },
      {
        "id": 37587,
        "date": "2025-06-04",
        "total_amount": 19.06,
        "transaction_type": "expense",
        "merchant_group_id": 7499,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Gabriel Bros"
        }
      },
      {
        "id": 37588,
        "date": "2025-06-04",
        "total_amount": 40,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37589,
        "date": "2025-06-04",
        "total_amount": 56.16,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37590,
        "date": "2025-06-04",
        "total_amount": 41,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38492,
        "date": "2025-06-04",
        "total_amount": 583.4,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38690,
        "date": "2025-06-04",
        "total_amount": 22.85,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39199,
        "date": "2025-06-04",
        "total_amount": 555.86,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39867,
        "date": "2025-06-04",
        "total_amount": 2036.27,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37356,
        "date": "2025-06-05",
        "total_amount": 18.72,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37357,
        "date": "2025-06-05",
        "total_amount": 80.52,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37582,
        "date": "2025-06-05",
        "total_amount": 40.79,
        "transaction_type": "expense",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 37583,
        "date": "2025-06-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 37584,
        "date": "2025-06-05",
        "total_amount": 275.56,
        "transaction_type": "expense",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 37585,
        "date": "2025-06-05",
        "total_amount": 83.87,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37749,
        "date": "2025-06-05",
        "total_amount": 62.64,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38490,
        "date": "2025-06-05",
        "total_amount": 2980.46,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 38491,
        "date": "2025-06-05",
        "total_amount": 216.74,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38570,
        "date": "2025-06-05",
        "total_amount": 38.6,
        "transaction_type": "expense",
        "merchant_group_id": 7470,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "True Classic Tees"
        }
      },
      {
        "id": 38579,
        "date": "2025-06-05",
        "total_amount": 19.29,
        "transaction_type": "expense",
        "merchant_group_id": 7470,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "True Classic Tees"
        }
      },
      {
        "id": 37344,
        "date": "2025-06-06",
        "total_amount": 8.82,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37345,
        "date": "2025-06-06",
        "total_amount": 5.17,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37346,
        "date": "2025-06-06",
        "total_amount": 10.16,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37347,
        "date": "2025-06-06",
        "total_amount": 13.22,
        "transaction_type": "expense",
        "merchant_group_id": 7484,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hobby Lobby"
        }
      },
      {
        "id": 37348,
        "date": "2025-06-06",
        "total_amount": 20.5,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38489,
        "date": "2025-06-06",
        "total_amount": 216.74,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37340,
        "date": "2025-06-07",
        "total_amount": 11.74,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 37341,
        "date": "2025-06-07",
        "total_amount": 17.23,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 37342,
        "date": "2025-06-07",
        "total_amount": 400.24,
        "transaction_type": "expense",
        "merchant_group_id": 7301,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Optavia"
        }
      },
      {
        "id": 37343,
        "date": "2025-06-07",
        "total_amount": 8.66,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38574,
        "date": "2025-06-07",
        "total_amount": 5.43,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38578,
        "date": "2025-06-07",
        "total_amount": 70,
        "transaction_type": "expense",
        "merchant_group_id": 7335,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Woodlands Camp"
        }
      },
      {
        "id": 38586,
        "date": "2025-06-07",
        "total_amount": 8.96,
        "transaction_type": "expense",
        "merchant_group_id": 7506,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Buc-ees"
        }
      },
      {
        "id": 38587,
        "date": "2025-06-07",
        "total_amount": 12.96,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37338,
        "date": "2025-06-08",
        "total_amount": 6.28,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 37339,
        "date": "2025-06-08",
        "total_amount": 45.33,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38594,
        "date": "2025-06-08",
        "total_amount": 31.85,
        "transaction_type": "expense",
        "merchant_group_id": 7363,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Food Lion"
        }
      },
      {
        "id": 38600,
        "date": "2025-06-08",
        "total_amount": 89.21,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37336,
        "date": "2025-06-09",
        "total_amount": 3.98,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37337,
        "date": "2025-06-09",
        "total_amount": 28.32,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37747,
        "date": "2025-06-09",
        "total_amount": 16.8,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 37748,
        "date": "2025-06-09",
        "total_amount": 18.15,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38567,
        "date": "2025-06-09",
        "total_amount": 125.95,
        "transaction_type": "expense",
        "merchant_group_id": 7472,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Beach Boyz Auto Repair"
        }
      },
      {
        "id": 38568,
        "date": "2025-06-09",
        "total_amount": 12.3,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 38569,
        "date": "2025-06-09",
        "total_amount": 190.78,
        "transaction_type": "expense",
        "merchant_group_id": 7503,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ollies Bargain Outlet"
        }
      },
      {
        "id": 38577,
        "date": "2025-06-09",
        "total_amount": 18.97,
        "transaction_type": "expense",
        "merchant_group_id": 7363,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Food Lion"
        }
      },
      {
        "id": 38592,
        "date": "2025-06-09",
        "total_amount": 9.93,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 38598,
        "date": "2025-06-09",
        "total_amount": 30.37,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38565,
        "date": "2025-06-10",
        "total_amount": 2.21,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38566,
        "date": "2025-06-10",
        "total_amount": 2.91,
        "transaction_type": "expense",
        "merchant_group_id": 7491,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "BP"
        }
      },
      {
        "id": 38576,
        "date": "2025-06-10",
        "total_amount": 15.95,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38588,
        "date": "2025-06-10",
        "total_amount": 21.69,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38597,
        "date": "2025-06-10",
        "total_amount": 1.52,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38599,
        "date": "2025-06-10",
        "total_amount": 101.79,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39198,
        "date": "2025-06-10",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38563,
        "date": "2025-06-11",
        "total_amount": 125.57,
        "transaction_type": "expense",
        "merchant_group_id": 7497,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Golden Corral"
        }
      },
      {
        "id": 38564,
        "date": "2025-06-11",
        "total_amount": 12,
        "transaction_type": "expense",
        "merchant_group_id": 7475,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Pier At Garden City"
        }
      },
      {
        "id": 38665,
        "date": "2025-06-11",
        "total_amount": 184.13,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 38689,
        "date": "2025-06-11",
        "total_amount": 31.59,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38546,
        "date": "2025-06-12",
        "total_amount": 62.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38561,
        "date": "2025-06-12",
        "total_amount": 5.4,
        "transaction_type": "expense",
        "merchant_group_id": 7496,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Loves"
        }
      },
      {
        "id": 38562,
        "date": "2025-06-12",
        "total_amount": 24.18,
        "transaction_type": "expense",
        "merchant_group_id": 7495,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Froyoz"
        }
      },
      {
        "id": 38573,
        "date": "2025-06-12",
        "total_amount": 13.99,
        "transaction_type": "expense",
        "merchant_group_id": 7354,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Murphy"
        }
      },
      {
        "id": 38585,
        "date": "2025-06-12",
        "total_amount": 2.19,
        "transaction_type": "expense",
        "merchant_group_id": 7506,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Buc-ees"
        }
      },
      {
        "id": 39209,
        "date": "2025-06-12",
        "total_amount": 1951.64,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39212,
        "date": "2025-06-12",
        "total_amount": 1736,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38121,
        "date": "2025-06-13",
        "total_amount": 1.78,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38488,
        "date": "2025-06-13",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38543,
        "date": "2025-06-13",
        "total_amount": 10.25,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38544,
        "date": "2025-06-13",
        "total_amount": 18.9,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38545,
        "date": "2025-06-13",
        "total_amount": 34.42,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38559,
        "date": "2025-06-13",
        "total_amount": 0.5,
        "transaction_type": "income",
        "merchant_group_id": 7335,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Woodlands Camp"
        }
      },
      {
        "id": 38560,
        "date": "2025-06-13",
        "total_amount": 56.9,
        "transaction_type": "expense",
        "merchant_group_id": 7338,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Express Tire Engineers"
        }
      },
      {
        "id": 38539,
        "date": "2025-06-14",
        "total_amount": 7.88,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38540,
        "date": "2025-06-14",
        "total_amount": 12.16,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38541,
        "date": "2025-06-14",
        "total_amount": 13.36,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38542,
        "date": "2025-06-14",
        "total_amount": 40.14,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 38580,
        "date": "2025-06-14",
        "total_amount": 14,
        "transaction_type": "expense",
        "merchant_group_id": 7507,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Green Laundry Lounge"
        }
      },
      {
        "id": 38581,
        "date": "2025-06-14",
        "total_amount": 20,
        "transaction_type": "expense",
        "merchant_group_id": 7507,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Green Laundry Lounge"
        }
      },
      {
        "id": 38589,
        "date": "2025-06-14",
        "total_amount": 4.25,
        "transaction_type": "expense",
        "merchant_group_id": 7507,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Green Laundry Lounge"
        }
      },
      {
        "id": 38590,
        "date": "2025-06-14",
        "total_amount": 12,
        "transaction_type": "expense",
        "merchant_group_id": 7507,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Green Laundry Lounge"
        }
      },
      {
        "id": 38537,
        "date": "2025-06-15",
        "total_amount": 72.4,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 38538,
        "date": "2025-06-15",
        "total_amount": 26.84,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38591,
        "date": "2025-06-15",
        "total_amount": 39.32,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 38595,
        "date": "2025-06-15",
        "total_amount": 3.2,
        "transaction_type": "expense",
        "merchant_group_id": 7326,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Disney Plus"
        }
      },
      {
        "id": 37662,
        "date": "2025-06-16",
        "total_amount": 90,
        "transaction_type": "expense",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 38485,
        "date": "2025-06-16",
        "total_amount": 422.01,
        "transaction_type": "income",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38486,
        "date": "2025-06-16",
        "total_amount": 485,
        "transaction_type": "income",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38487,
        "date": "2025-06-16",
        "total_amount": 81.7,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38536,
        "date": "2025-06-16",
        "total_amount": 15.16,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38557,
        "date": "2025-06-16",
        "total_amount": 9.12,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38558,
        "date": "2025-06-16",
        "total_amount": 81.04,
        "transaction_type": "expense",
        "merchant_group_id": 7471,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Boston Pizzeria"
        }
      },
      {
        "id": 38593,
        "date": "2025-06-16",
        "total_amount": 60.48,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 39197,
        "date": "2025-06-16",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39516,
        "date": "2025-06-16",
        "total_amount": 1900,
        "transaction_type": "expense",
        "merchant_group_id": 7519,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Irs Usataxpymt Jonathan R Heather A"
        }
      },
      {
        "id": 38118,
        "date": "2025-06-17",
        "total_amount": 40.42,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38119,
        "date": "2025-06-17",
        "total_amount": 10.62,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38120,
        "date": "2025-06-17",
        "total_amount": 11.22,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38484,
        "date": "2025-06-17",
        "total_amount": 4500,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 38556,
        "date": "2025-06-17",
        "total_amount": 3.88,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 38688,
        "date": "2025-06-17",
        "total_amount": 13.37,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38523,
        "date": "2025-06-18",
        "total_amount": 147.49,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38524,
        "date": "2025-06-18",
        "total_amount": 9.9,
        "transaction_type": "expense",
        "merchant_group_id": 7500,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lidl"
        }
      },
      {
        "id": 38554,
        "date": "2025-06-18",
        "total_amount": 11.95,
        "transaction_type": "expense",
        "merchant_group_id": 7370,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Once Upon A Child"
        }
      },
      {
        "id": 38555,
        "date": "2025-06-18",
        "total_amount": 47.76,
        "transaction_type": "expense",
        "merchant_group_id": 7498,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Fuddruckers"
        }
      },
      {
        "id": 38520,
        "date": "2025-06-19",
        "total_amount": 1684.8,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38521,
        "date": "2025-06-19",
        "total_amount": 1.5,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38522,
        "date": "2025-06-19",
        "total_amount": 15,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38553,
        "date": "2025-06-19",
        "total_amount": 3.01,
        "transaction_type": "expense",
        "merchant_group_id": 7309,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Bojangles"
        }
      },
      {
        "id": 37602,
        "date": "2025-06-20",
        "total_amount": 47.7,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37604,
        "date": "2025-06-20",
        "total_amount": 3.1,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 38479,
        "date": "2025-06-20",
        "total_amount": 10,
        "transaction_type": "income",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38480,
        "date": "2025-06-20",
        "total_amount": 4.8,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38481,
        "date": "2025-06-20",
        "total_amount": 12,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38482,
        "date": "2025-06-20",
        "total_amount": 1684.8,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38483,
        "date": "2025-06-20",
        "total_amount": 11208,
        "transaction_type": "expense",
        "merchant_group_id": 7448,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Autotrader"
        }
      },
      {
        "id": 38550,
        "date": "2025-06-20",
        "total_amount": 35.09,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 38551,
        "date": "2025-06-20",
        "total_amount": 18.31,
        "transaction_type": "expense",
        "merchant_group_id": 7501,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sweetfrog"
        }
      },
      {
        "id": 38552,
        "date": "2025-06-20",
        "total_amount": 24.63,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 39202,
        "date": "2025-06-20",
        "total_amount": 2113.63,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37659,
        "date": "2025-06-21",
        "total_amount": 115.48,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37660,
        "date": "2025-06-21",
        "total_amount": 19.4,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37661,
        "date": "2025-06-21",
        "total_amount": 54.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38687,
        "date": "2025-06-21",
        "total_amount": 14.48,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37658,
        "date": "2025-06-22",
        "total_amount": 13.26,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37746,
        "date": "2025-06-22",
        "total_amount": 11.1,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38518,
        "date": "2025-06-22",
        "total_amount": 44.44,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38519,
        "date": "2025-06-22",
        "total_amount": 45.41,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38534,
        "date": "2025-06-22",
        "total_amount": 6.35,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38548,
        "date": "2025-06-22",
        "total_amount": 25.26,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38549,
        "date": "2025-06-22",
        "total_amount": 19.21,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38686,
        "date": "2025-06-22",
        "total_amount": 893.9,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 38694,
        "date": "2025-06-22",
        "total_amount": 75.22,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 37656,
        "date": "2025-06-23",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7545,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "City Of Greer"
        }
      },
      {
        "id": 37657,
        "date": "2025-06-23",
        "total_amount": 2.17,
        "transaction_type": "expense",
        "merchant_group_id": 7545,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "City Of Greer"
        }
      },
      {
        "id": 38497,
        "date": "2025-06-23",
        "total_amount": 8000,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38498,
        "date": "2025-06-23",
        "total_amount": 147,
        "transaction_type": "expense",
        "merchant_group_id": 7341,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roots Real Estate"
        }
      },
      {
        "id": 38517,
        "date": "2025-06-23",
        "total_amount": 106.03,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38993,
        "date": "2025-06-23",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38994,
        "date": "2025-06-23",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39193,
        "date": "2025-06-23",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39194,
        "date": "2025-06-23",
        "total_amount": 8000,
        "transaction_type": "expense",
        "merchant_group_id": 7398,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Everyday Checking Xxxxxx44..."
        }
      },
      {
        "id": 39195,
        "date": "2025-06-23",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39196,
        "date": "2025-06-23",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37610,
        "date": "2025-06-24",
        "total_amount": 6.63,
        "transaction_type": "expense",
        "merchant_group_id": 7474,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Nothing Bundt Cake"
        }
      },
      {
        "id": 38476,
        "date": "2025-06-24",
        "total_amount": 6000,
        "transaction_type": "income",
        "merchant_group_id": 7307,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 38516,
        "date": "2025-06-24",
        "total_amount": 23.87,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 38547,
        "date": "2025-06-24",
        "total_amount": 11.17,
        "transaction_type": "expense",
        "merchant_group_id": 7466,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "DMV"
        }
      },
      {
        "id": 39204,
        "date": "2025-06-24",
        "total_amount": 2036.03,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37603,
        "date": "2025-06-25",
        "total_amount": 7.87,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37609,
        "date": "2025-06-25",
        "total_amount": 3.01,
        "transaction_type": "expense",
        "merchant_group_id": 7309,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Bojangles"
        }
      },
      {
        "id": 38139,
        "date": "2025-06-25",
        "total_amount": 795.91,
        "transaction_type": "expense",
        "merchant_group_id": 7494,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Discount Tire"
        }
      },
      {
        "id": 38596,
        "date": "2025-06-25",
        "total_amount": 5.16,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37600,
        "date": "2025-06-26",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7505,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Red Robin"
        }
      },
      {
        "id": 37601,
        "date": "2025-06-26",
        "total_amount": 4,
        "transaction_type": "expense",
        "merchant_group_id": 7463,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Safe Harbor"
        }
      },
      {
        "id": 37750,
        "date": "2025-06-26",
        "total_amount": 23.64,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38238,
        "date": "2025-06-26",
        "total_amount": 2.98,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 38239,
        "date": "2025-06-26",
        "total_amount": 2.23,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38513,
        "date": "2025-06-26",
        "total_amount": 23.77,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38514,
        "date": "2025-06-26",
        "total_amount": 48.73,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38515,
        "date": "2025-06-26",
        "total_amount": 62.85,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39214,
        "date": "2025-06-26",
        "total_amount": 963,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37598,
        "date": "2025-06-27",
        "total_amount": 35.41,
        "transaction_type": "expense",
        "merchant_group_id": 7457,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jets Pizza"
        }
      },
      {
        "id": 37599,
        "date": "2025-06-27",
        "total_amount": 1.26,
        "transaction_type": "expense",
        "merchant_group_id": 7493,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dunkin Donuts"
        }
      },
      {
        "id": 38236,
        "date": "2025-06-27",
        "total_amount": 18.77,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 38237,
        "date": "2025-06-27",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7297,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Power Homeschool"
        }
      },
      {
        "id": 38474,
        "date": "2025-06-27",
        "total_amount": 3998.02,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38475,
        "date": "2025-06-27",
        "total_amount": 15,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37597,
        "date": "2025-06-28",
        "total_amount": 91.02,
        "transaction_type": "expense",
        "merchant_group_id": 7504,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Red Lobster"
        }
      },
      {
        "id": 37607,
        "date": "2025-06-29",
        "total_amount": 6.26,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 37608,
        "date": "2025-06-29",
        "total_amount": 9.93,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 38233,
        "date": "2025-06-29",
        "total_amount": 37.71,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38234,
        "date": "2025-06-29",
        "total_amount": 5.5,
        "transaction_type": "expense",
        "merchant_group_id": 7319,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Church"
        }
      },
      {
        "id": 38235,
        "date": "2025-06-29",
        "total_amount": 15.73,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37595,
        "date": "2025-06-30",
        "total_amount": 2,
        "transaction_type": "expense",
        "merchant_group_id": 7490,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville Spartanburg Greer Sc"
        }
      },
      {
        "id": 37596,
        "date": "2025-06-30",
        "total_amount": 120,
        "transaction_type": "expense",
        "merchant_group_id": 7462,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roper Mountain Science Center"
        }
      },
      {
        "id": 38229,
        "date": "2025-06-30",
        "total_amount": 52.47,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38230,
        "date": "2025-06-30",
        "total_amount": 3.94,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38231,
        "date": "2025-06-30",
        "total_amount": 21.42,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38232,
        "date": "2025-06-30",
        "total_amount": 6.44,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 39057,
        "date": "2025-06-30",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39206,
        "date": "2025-06-30",
        "total_amount": 761.93,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38183,
        "date": "2025-07-01",
        "total_amount": 44,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38196,
        "date": "2025-07-01",
        "total_amount": 9.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38226,
        "date": "2025-07-01",
        "total_amount": 84,
        "transaction_type": "expense",
        "merchant_group_id": 7486,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "His Radio"
        }
      },
      {
        "id": 38227,
        "date": "2025-07-01",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": 7316,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "WCG Accounting"
        }
      },
      {
        "id": 38228,
        "date": "2025-07-01",
        "total_amount": 511.29,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38275,
        "date": "2025-07-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38465,
        "date": "2025-07-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38477,
        "date": "2025-07-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38816,
        "date": "2025-07-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38902,
        "date": "2025-07-01",
        "total_amount": 105.99,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38903,
        "date": "2025-07-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38904,
        "date": "2025-07-01",
        "total_amount": 7.63,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38925,
        "date": "2025-07-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39192,
        "date": "2025-07-01",
        "total_amount": 610.93,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 37605,
        "date": "2025-07-02",
        "total_amount": 7.56,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37655,
        "date": "2025-07-02",
        "total_amount": 12.17,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 38179,
        "date": "2025-07-02",
        "total_amount": 3.19,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38180,
        "date": "2025-07-02",
        "total_amount": 4.27,
        "transaction_type": "expense",
        "merchant_group_id": 7484,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hobby Lobby"
        }
      },
      {
        "id": 38181,
        "date": "2025-07-02",
        "total_amount": 4.96,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38224,
        "date": "2025-07-02",
        "total_amount": 8.47,
        "transaction_type": "expense",
        "merchant_group_id": 7499,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Gabriel Bros"
        }
      },
      {
        "id": 38225,
        "date": "2025-07-02",
        "total_amount": 34.44,
        "transaction_type": "expense",
        "merchant_group_id": 7484,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hobby Lobby"
        }
      },
      {
        "id": 38448,
        "date": "2025-07-02",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38472,
        "date": "2025-07-02",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38473,
        "date": "2025-07-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 38684,
        "date": "2025-07-02",
        "total_amount": 51.84,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38685,
        "date": "2025-07-02",
        "total_amount": 6.99,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39191,
        "date": "2025-07-02",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38447,
        "date": "2025-07-03",
        "total_amount": 30,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 38535,
        "date": "2025-07-03",
        "total_amount": 17.37,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38901,
        "date": "2025-07-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 37606,
        "date": "2025-07-04",
        "total_amount": 6.47,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38107,
        "date": "2025-07-04",
        "total_amount": 6,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 38178,
        "date": "2025-07-04",
        "total_amount": 23.36,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38221,
        "date": "2025-07-04",
        "total_amount": 106.86,
        "transaction_type": "expense",
        "merchant_group_id": 7492,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Carowinds"
        }
      },
      {
        "id": 38222,
        "date": "2025-07-04",
        "total_amount": 21.78,
        "transaction_type": "expense",
        "merchant_group_id": 7469,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ruby Thai"
        }
      },
      {
        "id": 38223,
        "date": "2025-07-04",
        "total_amount": 40,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38083,
        "date": "2025-07-05",
        "total_amount": 40.33,
        "transaction_type": "expense",
        "merchant_group_id": 7354,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Murphy"
        }
      },
      {
        "id": 38177,
        "date": "2025-07-05",
        "total_amount": 21.11,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38220,
        "date": "2025-07-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 38175,
        "date": "2025-07-06",
        "total_amount": 6.41,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38176,
        "date": "2025-07-06",
        "total_amount": 41.48,
        "transaction_type": "expense",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 38182,
        "date": "2025-07-06",
        "total_amount": 2.14,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38200,
        "date": "2025-07-06",
        "total_amount": 45.95,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38218,
        "date": "2025-07-06",
        "total_amount": 4.47,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 38219,
        "date": "2025-07-06",
        "total_amount": 13.37,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38530,
        "date": "2025-07-06",
        "total_amount": 11.45,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38676,
        "date": "2025-07-06",
        "total_amount": 71.94,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38680,
        "date": "2025-07-06",
        "total_amount": 2.15,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38174,
        "date": "2025-07-07",
        "total_amount": 8.76,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38195,
        "date": "2025-07-07",
        "total_amount": 11.6,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38215,
        "date": "2025-07-07",
        "total_amount": 9.72,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 38216,
        "date": "2025-07-07",
        "total_amount": 10.48,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38217,
        "date": "2025-07-07",
        "total_amount": 10.79,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38445,
        "date": "2025-07-07",
        "total_amount": 2980.46,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 38446,
        "date": "2025-07-07",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7542,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Check 417"
        }
      },
      {
        "id": 39190,
        "date": "2025-07-07",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38082,
        "date": "2025-07-08",
        "total_amount": 5.3,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38173,
        "date": "2025-07-08",
        "total_amount": 24.88,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38526,
        "date": "2025-07-08",
        "total_amount": 5.27,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38845,
        "date": "2025-07-08",
        "total_amount": 17.66,
        "transaction_type": "expense",
        "merchant_group_id": 7393,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0t3379m3 To Signify Business Essent..."
        }
      },
      {
        "id": 38900,
        "date": "2025-07-08",
        "total_amount": 17.66,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39207,
        "date": "2025-07-08",
        "total_amount": 1399.71,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38170,
        "date": "2025-07-09",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7473,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cohort"
        }
      },
      {
        "id": 38171,
        "date": "2025-07-09",
        "total_amount": 6.04,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 38172,
        "date": "2025-07-09",
        "total_amount": 14.86,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 38452,
        "date": "2025-07-09",
        "total_amount": 175,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38166,
        "date": "2025-07-10",
        "total_amount": 8.99,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 38167,
        "date": "2025-07-10",
        "total_amount": 37.68,
        "transaction_type": "expense",
        "merchant_group_id": 7483,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greer Pediatric Dental"
        }
      },
      {
        "id": 38168,
        "date": "2025-07-10",
        "total_amount": 589.11,
        "transaction_type": "expense",
        "merchant_group_id": 7465,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wilkins Carpet Tile"
        }
      },
      {
        "id": 38169,
        "date": "2025-07-10",
        "total_amount": 215.2,
        "transaction_type": "expense",
        "merchant_group_id": 7479,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Batteries Plus"
        }
      },
      {
        "id": 38214,
        "date": "2025-07-10",
        "total_amount": 19.99,
        "transaction_type": "expense",
        "merchant_group_id": 7479,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Batteries Plus"
        }
      },
      {
        "id": 37654,
        "date": "2025-07-11",
        "total_amount": 208.7,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37663,
        "date": "2025-07-11",
        "total_amount": 566.6,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38081,
        "date": "2025-07-11",
        "total_amount": 6.98,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38163,
        "date": "2025-07-11",
        "total_amount": 5.07,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38164,
        "date": "2025-07-11",
        "total_amount": 7.62,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 38165,
        "date": "2025-07-11",
        "total_amount": 18.5,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 38212,
        "date": "2025-07-11",
        "total_amount": 6142.76,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38213,
        "date": "2025-07-11",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38443,
        "date": "2025-07-11",
        "total_amount": 3997.98,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38444,
        "date": "2025-07-11",
        "total_amount": 100,
        "transaction_type": "income",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38527,
        "date": "2025-07-11",
        "total_amount": 3.33,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38532,
        "date": "2025-07-11",
        "total_amount": 5.4,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38668,
        "date": "2025-07-11",
        "total_amount": 40.28,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38669,
        "date": "2025-07-11",
        "total_amount": 37.62,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38674,
        "date": "2025-07-11",
        "total_amount": 15.62,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38697,
        "date": "2025-07-11",
        "total_amount": 900.97,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38080,
        "date": "2025-07-12",
        "total_amount": 3.79,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 38161,
        "date": "2025-07-12",
        "total_amount": 19.82,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38162,
        "date": "2025-07-12",
        "total_amount": 4.94,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38201,
        "date": "2025-07-12",
        "total_amount": 22.93,
        "transaction_type": "expense",
        "merchant_group_id": 7310,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dominos"
        }
      },
      {
        "id": 38211,
        "date": "2025-07-12",
        "total_amount": 2.26,
        "transaction_type": "expense",
        "merchant_group_id": 7364,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Publix"
        }
      },
      {
        "id": 38533,
        "date": "2025-07-12",
        "total_amount": 3.88,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 38078,
        "date": "2025-07-13",
        "total_amount": 1.72,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38079,
        "date": "2025-07-13",
        "total_amount": 1.78,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38159,
        "date": "2025-07-13",
        "total_amount": 5.75,
        "transaction_type": "expense",
        "merchant_group_id": 7319,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Church"
        }
      },
      {
        "id": 38160,
        "date": "2025-07-13",
        "total_amount": 15.74,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 38198,
        "date": "2025-07-13",
        "total_amount": 1.25,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38202,
        "date": "2025-07-13",
        "total_amount": 7.98,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 38203,
        "date": "2025-07-13",
        "total_amount": 7,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 38210,
        "date": "2025-07-13",
        "total_amount": 46.5,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38156,
        "date": "2025-07-14",
        "total_amount": 16.2,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38157,
        "date": "2025-07-14",
        "total_amount": 8.19,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 38158,
        "date": "2025-07-14",
        "total_amount": 13.27,
        "transaction_type": "expense",
        "merchant_group_id": 7478,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Applebees"
        }
      },
      {
        "id": 38209,
        "date": "2025-07-14",
        "total_amount": 14.98,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38439,
        "date": "2025-07-14",
        "total_amount": 147.26,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 38440,
        "date": "2025-07-14",
        "total_amount": 900.97,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 38441,
        "date": "2025-07-14",
        "total_amount": 6142.76,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38442,
        "date": "2025-07-14",
        "total_amount": 177.59,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 38582,
        "date": "2025-07-14",
        "total_amount": 78.44,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39189,
        "date": "2025-07-14",
        "total_amount": 566.6,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39213,
        "date": "2025-07-14",
        "total_amount": 2290.05,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38155,
        "date": "2025-07-15",
        "total_amount": 4.74,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38194,
        "date": "2025-07-15",
        "total_amount": 9.91,
        "transaction_type": "expense",
        "merchant_group_id": 7478,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Applebees"
        }
      },
      {
        "id": 38207,
        "date": "2025-07-15",
        "total_amount": 3.2,
        "transaction_type": "expense",
        "merchant_group_id": 7326,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Disney Plus"
        }
      },
      {
        "id": 38208,
        "date": "2025-07-15",
        "total_amount": 153.69,
        "transaction_type": "expense",
        "merchant_group_id": 7467,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wybot"
        }
      },
      {
        "id": 38434,
        "date": "2025-07-15",
        "total_amount": 77.59,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 38435,
        "date": "2025-07-15",
        "total_amount": 270,
        "transaction_type": "expense",
        "merchant_group_id": 7369,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cash Withdrawal In Branch"
        }
      },
      {
        "id": 38436,
        "date": "2025-07-15",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7369,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cash Withdrawal In Branch"
        }
      },
      {
        "id": 38455,
        "date": "2025-07-15",
        "total_amount": 229,
        "transaction_type": "expense",
        "merchant_group_id": 7343,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lismore Park HOA"
        }
      },
      {
        "id": 38456,
        "date": "2025-07-15",
        "total_amount": 4.95,
        "transaction_type": "expense",
        "merchant_group_id": 7343,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lismore Park HOA"
        }
      },
      {
        "id": 38525,
        "date": "2025-07-15",
        "total_amount": 27.25,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38531,
        "date": "2025-07-15",
        "total_amount": 248.4,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39201,
        "date": "2025-07-15",
        "total_amount": 1274.58,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38021,
        "date": "2025-07-16",
        "total_amount": 132.5,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38022,
        "date": "2025-07-16",
        "total_amount": 2159.48,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 38023,
        "date": "2025-07-16",
        "total_amount": 83.44,
        "transaction_type": "expense",
        "merchant_group_id": 7300,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Groundfloor"
        }
      },
      {
        "id": 38154,
        "date": "2025-07-16",
        "total_amount": 14.54,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38206,
        "date": "2025-07-16",
        "total_amount": 7.98,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 39188,
        "date": "2025-07-16",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38077,
        "date": "2025-07-17",
        "total_amount": 70.36,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38152,
        "date": "2025-07-17",
        "total_amount": 78.12,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38153,
        "date": "2025-07-17",
        "total_amount": 26.69,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38204,
        "date": "2025-07-17",
        "total_amount": 4.74,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38205,
        "date": "2025-07-17",
        "total_amount": 189.74,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38584,
        "date": "2025-07-17",
        "total_amount": 6.86,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37635,
        "date": "2025-07-18",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38076,
        "date": "2025-07-18",
        "total_amount": 3.75,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38149,
        "date": "2025-07-18",
        "total_amount": 16.34,
        "transaction_type": "expense",
        "merchant_group_id": 7482,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Five Below"
        }
      },
      {
        "id": 38150,
        "date": "2025-07-18",
        "total_amount": 2472,
        "transaction_type": "expense",
        "merchant_group_id": 7476,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Global Service Network Apex Nc"
        }
      },
      {
        "id": 38151,
        "date": "2025-07-18",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7452,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "76 Petroleum"
        }
      },
      {
        "id": 38184,
        "date": "2025-07-18",
        "total_amount": 25.48,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38844,
        "date": "2025-07-18",
        "total_amount": 625,
        "transaction_type": "income",
        "merchant_group_id": 7373,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Brand Leader The Brand Leader Paying Bill Via..."
        }
      },
      {
        "id": 37653,
        "date": "2025-07-19",
        "total_amount": 169.59,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38148,
        "date": "2025-07-19",
        "total_amount": 36.57,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 38116,
        "date": "2025-07-20",
        "total_amount": 27.3,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38145,
        "date": "2025-07-20",
        "total_amount": 46.5,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38146,
        "date": "2025-07-20",
        "total_amount": 2.16,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38147,
        "date": "2025-07-20",
        "total_amount": 70,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38666,
        "date": "2025-07-20",
        "total_amount": 75.14,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38667,
        "date": "2025-07-20",
        "total_amount": 5.38,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37652,
        "date": "2025-07-21",
        "total_amount": 54.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38089,
        "date": "2025-07-21",
        "total_amount": 8.75,
        "transaction_type": "expense",
        "merchant_group_id": 7487,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Electrify America"
        }
      },
      {
        "id": 38115,
        "date": "2025-07-21",
        "total_amount": 9.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38197,
        "date": "2025-07-21",
        "total_amount": 5.4,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37633,
        "date": "2025-07-22",
        "total_amount": 1000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37634,
        "date": "2025-07-22",
        "total_amount": 8000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38185,
        "date": "2025-07-22",
        "total_amount": 52.45,
        "transaction_type": "expense",
        "merchant_group_id": 7488,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Regal Hollywood Cinemas"
        }
      },
      {
        "id": 38186,
        "date": "2025-07-22",
        "total_amount": 10.79,
        "transaction_type": "expense",
        "merchant_group_id": 7488,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Regal Hollywood Cinemas"
        }
      },
      {
        "id": 38843,
        "date": "2025-07-22",
        "total_amount": 1000,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 38899,
        "date": "2025-07-22",
        "total_amount": 68.83,
        "transaction_type": "expense",
        "merchant_group_id": 7566,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Dd Doordash Thehomede San Franciscoca"
        }
      },
      {
        "id": 38991,
        "date": "2025-07-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38992,
        "date": "2025-07-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39184,
        "date": "2025-07-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39185,
        "date": "2025-07-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39186,
        "date": "2025-07-22",
        "total_amount": 8000,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 39187,
        "date": "2025-07-22",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39205,
        "date": "2025-07-22",
        "total_amount": 1908.47,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37627,
        "date": "2025-07-23",
        "total_amount": 204.97,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 37632,
        "date": "2025-07-23",
        "total_amount": 70,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38075,
        "date": "2025-07-23",
        "total_amount": 10.25,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 38084,
        "date": "2025-07-23",
        "total_amount": 6.51,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38085,
        "date": "2025-07-23",
        "total_amount": 7.34,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38086,
        "date": "2025-07-23",
        "total_amount": 9.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38088,
        "date": "2025-07-23",
        "total_amount": 68.87,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 37877,
        "date": "2025-07-24",
        "total_amount": 10310.7,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 38073,
        "date": "2025-07-24",
        "total_amount": 16.43,
        "transaction_type": "expense",
        "merchant_group_id": 7464,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mr Ks Used Books"
        }
      },
      {
        "id": 38074,
        "date": "2025-07-24",
        "total_amount": 102.39,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38095,
        "date": "2025-07-24",
        "total_amount": 8,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 37883,
        "date": "2025-07-25",
        "total_amount": 3998.02,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37989,
        "date": "2025-07-25",
        "total_amount": 1.72,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38020,
        "date": "2025-07-25",
        "total_amount": 84.68,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38070,
        "date": "2025-07-25",
        "total_amount": 10.75,
        "transaction_type": "expense",
        "merchant_group_id": 7480,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cheesecake Factory"
        }
      },
      {
        "id": 38071,
        "date": "2025-07-25",
        "total_amount": 4.96,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38072,
        "date": "2025-07-25",
        "total_amount": 40.96,
        "transaction_type": "expense",
        "merchant_group_id": 7478,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Applebees"
        }
      },
      {
        "id": 38094,
        "date": "2025-07-25",
        "total_amount": 41.65,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38187,
        "date": "2025-07-25",
        "total_amount": 18,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37745,
        "date": "2025-07-26",
        "total_amount": 189.74,
        "transaction_type": "income",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 38068,
        "date": "2025-07-26",
        "total_amount": 6.31,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38069,
        "date": "2025-07-26",
        "total_amount": 2.19,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38065,
        "date": "2025-07-27",
        "total_amount": 2.16,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38066,
        "date": "2025-07-27",
        "total_amount": 0.97,
        "transaction_type": "expense",
        "merchant_group_id": 7454,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Habit Burger"
        }
      },
      {
        "id": 38067,
        "date": "2025-07-27",
        "total_amount": 9.53,
        "transaction_type": "expense",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 38093,
        "date": "2025-07-27",
        "total_amount": 2.37,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 38096,
        "date": "2025-07-27",
        "total_amount": 1,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 38528,
        "date": "2025-07-27",
        "total_amount": 27.21,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37619,
        "date": "2025-07-28",
        "total_amount": 700,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37622,
        "date": "2025-07-28",
        "total_amount": 18,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37626,
        "date": "2025-07-28",
        "total_amount": 31.8,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37647,
        "date": "2025-07-28",
        "total_amount": 3.98,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37648,
        "date": "2025-07-28",
        "total_amount": 72.07,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37649,
        "date": "2025-07-28",
        "total_amount": 74.02,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37650,
        "date": "2025-07-28",
        "total_amount": 15.36,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37651,
        "date": "2025-07-28",
        "total_amount": 27.18,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38059,
        "date": "2025-07-28",
        "total_amount": 1.25,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38060,
        "date": "2025-07-28",
        "total_amount": 25.98,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38061,
        "date": "2025-07-28",
        "total_amount": 80.59,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38062,
        "date": "2025-07-28",
        "total_amount": 533.88,
        "transaction_type": "expense",
        "merchant_group_id": 7360,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Vevor"
        }
      },
      {
        "id": 38063,
        "date": "2025-07-28",
        "total_amount": 39.08,
        "transaction_type": "expense",
        "merchant_group_id": 7484,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hobby Lobby"
        }
      },
      {
        "id": 38064,
        "date": "2025-07-28",
        "total_amount": 9.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38142,
        "date": "2025-07-28",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7306,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Miracle Hill"
        }
      },
      {
        "id": 39183,
        "date": "2025-07-28",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39865,
        "date": "2025-07-28",
        "total_amount": 1274.58,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38056,
        "date": "2025-07-29",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7297,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Power Homeschool"
        }
      },
      {
        "id": 38057,
        "date": "2025-07-29",
        "total_amount": 7.02,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38058,
        "date": "2025-07-29",
        "total_amount": 9.82,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38199,
        "date": "2025-07-29",
        "total_amount": 3.75,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37636,
        "date": "2025-07-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37646,
        "date": "2025-07-30",
        "total_amount": 77.43,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37720,
        "date": "2025-07-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38018,
        "date": "2025-07-30",
        "total_amount": 74.19,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38019,
        "date": "2025-07-30",
        "total_amount": 9.15,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38054,
        "date": "2025-07-30",
        "total_amount": 3.17,
        "transaction_type": "expense",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 38055,
        "date": "2025-07-30",
        "total_amount": 11.17,
        "transaction_type": "expense",
        "merchant_group_id": 7477,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Brusters"
        }
      },
      {
        "id": 39208,
        "date": "2025-07-30",
        "total_amount": 1959.4,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38052,
        "date": "2025-07-31",
        "total_amount": 4.85,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38053,
        "date": "2025-07-31",
        "total_amount": 0.89,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38092,
        "date": "2025-07-31",
        "total_amount": 10.25,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 38990,
        "date": "2025-07-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 37630,
        "date": "2025-08-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37631,
        "date": "2025-08-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38048,
        "date": "2025-08-01",
        "total_amount": 36.5,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38049,
        "date": "2025-08-01",
        "total_amount": 84,
        "transaction_type": "expense",
        "merchant_group_id": 7486,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "His Radio"
        }
      },
      {
        "id": 38050,
        "date": "2025-08-01",
        "total_amount": 511.29,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 38051,
        "date": "2025-08-01",
        "total_amount": 10.25,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38188,
        "date": "2025-08-01",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": 7316,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "WCG Accounting"
        }
      },
      {
        "id": 38529,
        "date": "2025-08-01",
        "total_amount": 74.99,
        "transaction_type": "expense",
        "merchant_group_id": 7489,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Bt Digital Intera Tx"
        }
      },
      {
        "id": 38583,
        "date": "2025-08-01",
        "total_amount": 130,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38808,
        "date": "2025-08-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38811,
        "date": "2025-08-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38897,
        "date": "2025-08-01",
        "total_amount": 90.76,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38898,
        "date": "2025-08-01",
        "total_amount": 1.96,
        "transaction_type": "expense",
        "merchant_group_id": 7456,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Google"
        }
      },
      {
        "id": 38924,
        "date": "2025-08-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39182,
        "date": "2025-08-01",
        "total_amount": 610.93,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 38047,
        "date": "2025-08-02",
        "total_amount": 39.15,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 38090,
        "date": "2025-08-02",
        "total_amount": 1.07,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38091,
        "date": "2025-08-02",
        "total_amount": 0.89,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38144,
        "date": "2025-08-02",
        "total_amount": 41.26,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37495,
        "date": "2025-08-03",
        "total_amount": 59.34,
        "transaction_type": "income",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38042,
        "date": "2025-08-03",
        "total_amount": 4.32,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38043,
        "date": "2025-08-03",
        "total_amount": 8.64,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 38044,
        "date": "2025-08-03",
        "total_amount": 9.46,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38046,
        "date": "2025-08-03",
        "total_amount": 17.64,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38896,
        "date": "2025-08-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 37621,
        "date": "2025-08-04",
        "total_amount": 8,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37625,
        "date": "2025-08-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 37645,
        "date": "2025-08-04",
        "total_amount": 174.62,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38117,
        "date": "2025-08-04",
        "total_amount": 45.99,
        "transaction_type": "expense",
        "merchant_group_id": 7489,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Bt Digital Intera Tx"
        }
      },
      {
        "id": 39181,
        "date": "2025-08-04",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37620,
        "date": "2025-08-05",
        "total_amount": 190,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37875,
        "date": "2025-08-05",
        "total_amount": 2980.46,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37882,
        "date": "2025-08-08",
        "total_amount": 3998.02,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37644,
        "date": "2025-08-09",
        "total_amount": 36.67,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38017,
        "date": "2025-08-09",
        "total_amount": 8.41,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37643,
        "date": "2025-08-11",
        "total_amount": 310.04,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39180,
        "date": "2025-08-11",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39211,
        "date": "2025-08-11",
        "total_amount": 1277.81,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37838,
        "date": "2025-08-12",
        "total_amount": 703.1,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38842,
        "date": "2025-08-13",
        "total_amount": 220.68,
        "transaction_type": "expense",
        "merchant_group_id": 7430,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0thyqmd3 To Signify Business Essent..."
        }
      },
      {
        "id": 38895,
        "date": "2025-08-13",
        "total_amount": 220.68,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39215,
        "date": "2025-08-13",
        "total_amount": 1865.5,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37874,
        "date": "2025-08-14",
        "total_amount": 161.66,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39179,
        "date": "2025-08-14",
        "total_amount": 132.35,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 38894,
        "date": "2025-08-17",
        "total_amount": 117.5,
        "transaction_type": "expense",
        "merchant_group_id": 7540,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Tmobile Auto Pay 800 937 8997 Wa"
        }
      },
      {
        "id": 37571,
        "date": "2025-08-18",
        "total_amount": 1007.94,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37615,
        "date": "2025-08-18",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37616,
        "date": "2025-08-18",
        "total_amount": 16655.44,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37850,
        "date": "2025-08-18",
        "total_amount": 474.98,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37873,
        "date": "2025-08-18",
        "total_amount": 3,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 39177,
        "date": "2025-08-18",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7537,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0qmwbnnc Everyday Ch..."
        }
      },
      {
        "id": 39178,
        "date": "2025-08-18",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39203,
        "date": "2025-08-18",
        "total_amount": 1729.51,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37565,
        "date": "2025-08-19",
        "total_amount": 9.36,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37871,
        "date": "2025-08-19",
        "total_amount": 7317.49,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37872,
        "date": "2025-08-19",
        "total_amount": 474.98,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39176,
        "date": "2025-08-19",
        "total_amount": 1007.94,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39163,
        "date": "2025-08-20",
        "total_amount": 1651.91,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37564,
        "date": "2025-08-21",
        "total_amount": 54.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37881,
        "date": "2025-08-22",
        "total_amount": 3998.02,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38988,
        "date": "2025-08-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38989,
        "date": "2025-08-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39157,
        "date": "2025-08-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39158,
        "date": "2025-08-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39856,
        "date": "2025-08-25",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38016,
        "date": "2025-08-26",
        "total_amount": 136.75,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38133,
        "date": "2025-08-26",
        "total_amount": 2000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39164,
        "date": "2025-08-26",
        "total_amount": 1052.45,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37562,
        "date": "2025-08-27",
        "total_amount": 104.94,
        "transaction_type": "expense",
        "merchant_group_id": 7290,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Wyze Labs"
        }
      },
      {
        "id": 37563,
        "date": "2025-08-27",
        "total_amount": 37.1,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37862,
        "date": "2025-08-27",
        "total_amount": 561.8,
        "transaction_type": "expense",
        "merchant_group_id": 7437,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville County"
        }
      },
      {
        "id": 38132,
        "date": "2025-08-27",
        "total_amount": 1.5,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39175,
        "date": "2025-08-27",
        "total_amount": 1538.95,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37614,
        "date": "2025-08-29",
        "total_amount": 1050,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37870,
        "date": "2025-08-29",
        "total_amount": 1050,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 39056,
        "date": "2025-08-29",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 38893,
        "date": "2025-08-30",
        "total_amount": 240.82,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37561,
        "date": "2025-09-01",
        "total_amount": 28.61,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38015,
        "date": "2025-09-01",
        "total_amount": 95,
        "transaction_type": "expense",
        "merchant_group_id": 7367,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Services"
        }
      },
      {
        "id": 38923,
        "date": "2025-09-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37612,
        "date": "2025-09-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37613,
        "date": "2025-09-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37773,
        "date": "2025-09-02",
        "total_amount": 500,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 37798,
        "date": "2025-09-02",
        "total_amount": 11.65,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 37868,
        "date": "2025-09-02",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37869,
        "date": "2025-09-02",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37938,
        "date": "2025-09-02",
        "total_amount": 3362.25,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38807,
        "date": "2025-09-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38810,
        "date": "2025-09-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38841,
        "date": "2025-09-02",
        "total_amount": 240.82,
        "transaction_type": "expense",
        "merchant_group_id": 7529,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0tqdw3f4 To Signify Business Essent..."
        }
      },
      {
        "id": 39155,
        "date": "2025-09-02",
        "total_amount": 610.93,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39156,
        "date": "2025-09-02",
        "total_amount": 1481.93,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 39171,
        "date": "2025-09-02",
        "total_amount": 1598.42,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37559,
        "date": "2025-09-03",
        "total_amount": 201.23,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37560,
        "date": "2025-09-03",
        "total_amount": 90,
        "transaction_type": "expense",
        "merchant_group_id": 7416,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Patriot Pest Management"
        }
      },
      {
        "id": 37818,
        "date": "2025-09-03",
        "total_amount": 4.69,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37820,
        "date": "2025-09-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 37821,
        "date": "2025-09-03",
        "total_amount": 16.37,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37827,
        "date": "2025-09-03",
        "total_amount": 41.46,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37861,
        "date": "2025-09-03",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 37865,
        "date": "2025-09-03",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 37866,
        "date": "2025-09-03",
        "total_amount": 275,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37867,
        "date": "2025-09-03",
        "total_amount": 3362.25,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37555,
        "date": "2025-09-04",
        "total_amount": 166.47,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37556,
        "date": "2025-09-04",
        "total_amount": 25.14,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37555,
        "date": "2025-09-04",
        "total_amount": 166.47,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37556,
        "date": "2025-09-04",
        "total_amount": 25.14,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37864,
        "date": "2025-09-04",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37557,
        "date": "2025-09-04",
        "total_amount": 10.54,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37558,
        "date": "2025-09-04",
        "total_amount": 63.35,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37814,
        "date": "2025-09-04",
        "total_amount": 13.08,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37857,
        "date": "2025-09-05",
        "total_amount": 5194.61,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 37772,
        "date": "2025-09-05",
        "total_amount": 10.78,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 37554,
        "date": "2025-09-05",
        "total_amount": 19.07,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38852,
        "date": "2025-09-05",
        "total_amount": 21.69,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37880,
        "date": "2025-09-05",
        "total_amount": 3998.06,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37553,
        "date": "2025-09-05",
        "total_amount": 29.67,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37570,
        "date": "2025-09-05",
        "total_amount": 147.55,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37761,
        "date": "2025-09-05",
        "total_amount": 8.49,
        "transaction_type": "expense",
        "merchant_group_id": 7323,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Discount Grocery"
        }
      },
      {
        "id": 37810,
        "date": "2025-09-05",
        "total_amount": 77.9,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38014,
        "date": "2025-09-05",
        "total_amount": 12.94,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 37860,
        "date": "2025-09-05",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37803,
        "date": "2025-09-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 37796,
        "date": "2025-09-05",
        "total_amount": 17.31,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37859,
        "date": "2025-09-05",
        "total_amount": 901.55,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37858,
        "date": "2025-09-05",
        "total_amount": 2924.77,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37802,
        "date": "2025-09-06",
        "total_amount": 6.89,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38013,
        "date": "2025-09-06",
        "total_amount": 34.51,
        "transaction_type": "expense",
        "merchant_group_id": 7362,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chipotle"
        }
      },
      {
        "id": 37552,
        "date": "2025-09-06",
        "total_amount": 625.37,
        "transaction_type": "expense",
        "merchant_group_id": 7431,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Ashley Store Greenville"
        }
      },
      {
        "id": 37771,
        "date": "2025-09-06",
        "total_amount": 6.59,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38012,
        "date": "2025-09-06",
        "total_amount": 10.36,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 37809,
        "date": "2025-09-06",
        "total_amount": 23.08,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 37876,
        "date": "2025-09-07",
        "total_amount": 6,
        "transaction_type": "expense",
        "merchant_group_id": 7319,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Church"
        }
      },
      {
        "id": 37795,
        "date": "2025-09-07",
        "total_amount": 39.34,
        "transaction_type": "expense",
        "merchant_group_id": 7354,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Murphy"
        }
      },
      {
        "id": 37760,
        "date": "2025-09-07",
        "total_amount": 39.9,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37770,
        "date": "2025-09-07",
        "total_amount": 130.46,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37759,
        "date": "2025-09-07",
        "total_amount": 6.79,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37937,
        "date": "2025-09-07",
        "total_amount": 67,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 37849,
        "date": "2025-09-08",
        "total_amount": 240.16,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37936,
        "date": "2025-09-08",
        "total_amount": 7.43,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37569,
        "date": "2025-09-08",
        "total_amount": 1009.96,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39154,
        "date": "2025-09-09",
        "total_amount": 1009.96,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39978,
        "date": "2025-09-09",
        "total_amount": 96.43,
        "transaction_type": "expense",
        "merchant_group_id": 7391,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Target Taylors"
        }
      },
      {
        "id": 38131,
        "date": "2025-09-09",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37856,
        "date": "2025-09-09",
        "total_amount": 240.16,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 37935,
        "date": "2025-09-09",
        "total_amount": 9.93,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 37934,
        "date": "2025-09-09",
        "total_amount": 458,
        "transaction_type": "expense",
        "merchant_group_id": 7292,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Stanley Steemer"
        }
      },
      {
        "id": 38011,
        "date": "2025-09-09",
        "total_amount": 96.43,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 37928,
        "date": "2025-09-10",
        "total_amount": 18.51,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 37855,
        "date": "2025-09-10",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37933,
        "date": "2025-09-10",
        "total_amount": 4.74,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37930,
        "date": "2025-09-10",
        "total_amount": 1.3,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37927,
        "date": "2025-09-10",
        "total_amount": 5.39,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 37929,
        "date": "2025-09-10",
        "total_amount": 37.09,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 37551,
        "date": "2025-09-11",
        "total_amount": 263.44,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37926,
        "date": "2025-09-11",
        "total_amount": 16.2,
        "transaction_type": "expense",
        "merchant_group_id": 7315,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Pizza Hut"
        }
      },
      {
        "id": 39172,
        "date": "2025-09-12",
        "total_amount": 954,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38130,
        "date": "2025-09-12",
        "total_amount": 2674.21,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37925,
        "date": "2025-09-12",
        "total_amount": 8.64,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37550,
        "date": "2025-09-12",
        "total_amount": 79.78,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37549,
        "date": "2025-09-12",
        "total_amount": 85.82,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38010,
        "date": "2025-09-12",
        "total_amount": 36.16,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37924,
        "date": "2025-09-13",
        "total_amount": 22.88,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 37742,
        "date": "2025-09-13",
        "total_amount": 46.58,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 37743,
        "date": "2025-09-13",
        "total_amount": 47.7,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 37923,
        "date": "2025-09-13",
        "total_amount": 4.64,
        "transaction_type": "expense",
        "merchant_group_id": 7318,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Blueberry Frog"
        }
      },
      {
        "id": 37917,
        "date": "2025-09-14",
        "total_amount": 15.97,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 37916,
        "date": "2025-09-14",
        "total_amount": 4.32,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37921,
        "date": "2025-09-14",
        "total_amount": 4.18,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37922,
        "date": "2025-09-14",
        "total_amount": 12.83,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37920,
        "date": "2025-09-14",
        "total_amount": 78.82,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37919,
        "date": "2025-09-14",
        "total_amount": 24,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37918,
        "date": "2025-09-14",
        "total_amount": 3,
        "transaction_type": "expense",
        "merchant_group_id": 7319,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Church"
        }
      },
      {
        "id": 37854,
        "date": "2025-09-15",
        "total_amount": 450,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 39152,
        "date": "2025-09-15",
        "total_amount": 450,
        "transaction_type": "expense",
        "merchant_group_id": 7538,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0ptvj6j6 Everyday Ch..."
        }
      },
      {
        "id": 39153,
        "date": "2025-09-15",
        "total_amount": 458,
        "transaction_type": "expense",
        "merchant_group_id": 7537,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0qmwbnnc Everyday Ch..."
        }
      },
      {
        "id": 39166,
        "date": "2025-09-15",
        "total_amount": 1277.8,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38128,
        "date": "2025-09-15",
        "total_amount": 458,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38129,
        "date": "2025-09-15",
        "total_amount": 450,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37914,
        "date": "2025-09-15",
        "total_amount": 10.46,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37915,
        "date": "2025-09-15",
        "total_amount": 26.78,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37913,
        "date": "2025-09-16",
        "total_amount": 9.94,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37853,
        "date": "2025-09-16",
        "total_amount": 500,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37819,
        "date": "2025-09-17",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7540,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Tmobile Auto Pay 800 937 8997 Wa"
        }
      },
      {
        "id": 38110,
        "date": "2025-09-17",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37912,
        "date": "2025-09-17",
        "total_amount": 6.55,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37548,
        "date": "2025-09-17",
        "total_amount": 39.24,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38111,
        "date": "2025-09-17",
        "total_amount": 3.88,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38009,
        "date": "2025-09-17",
        "total_amount": 17.4,
        "transaction_type": "expense",
        "merchant_group_id": 7344,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "NC Quick Pass"
        }
      },
      {
        "id": 37852,
        "date": "2025-09-17",
        "total_amount": 250.8,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 37831,
        "date": "2025-09-18",
        "total_amount": 39.49,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 37834,
        "date": "2025-09-18",
        "total_amount": 4.96,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 37863,
        "date": "2025-09-18",
        "total_amount": 15,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38006,
        "date": "2025-09-18",
        "total_amount": 9.48,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 37832,
        "date": "2025-09-19",
        "total_amount": 37.94,
        "transaction_type": "expense",
        "merchant_group_id": 7354,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Murphy"
        }
      },
      {
        "id": 37907,
        "date": "2025-09-19",
        "total_amount": 7.98,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37908,
        "date": "2025-09-19",
        "total_amount": 11.76,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 37909,
        "date": "2025-09-19",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37910,
        "date": "2025-09-19",
        "total_amount": 3.93,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37911,
        "date": "2025-09-19",
        "total_amount": 7.87,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37833,
        "date": "2025-09-19",
        "total_amount": 14.87,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37879,
        "date": "2025-09-19",
        "total_amount": 3998.02,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38127,
        "date": "2025-09-19",
        "total_amount": 200,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37847,
        "date": "2025-09-20",
        "total_amount": 6.24,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37906,
        "date": "2025-09-20",
        "total_amount": 13.58,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37905,
        "date": "2025-09-20",
        "total_amount": 20.2,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37904,
        "date": "2025-09-20",
        "total_amount": 3.2,
        "transaction_type": "expense",
        "merchant_group_id": 7326,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Disney Plus"
        }
      },
      {
        "id": 37830,
        "date": "2025-09-20",
        "total_amount": 37.51,
        "transaction_type": "expense",
        "merchant_group_id": 7354,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Murphy"
        }
      },
      {
        "id": 37903,
        "date": "2025-09-21",
        "total_amount": 12.96,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37902,
        "date": "2025-09-21",
        "total_amount": 4.32,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37901,
        "date": "2025-09-21",
        "total_amount": 4.32,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37547,
        "date": "2025-09-21",
        "total_amount": 54.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 38005,
        "date": "2025-09-21",
        "total_amount": 327.25,
        "transaction_type": "expense",
        "merchant_group_id": 7360,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Vevor"
        }
      },
      {
        "id": 37899,
        "date": "2025-09-22",
        "total_amount": 20.85,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38987,
        "date": "2025-09-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38986,
        "date": "2025-09-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39150,
        "date": "2025-09-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39151,
        "date": "2025-09-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39161,
        "date": "2025-09-22",
        "total_amount": 1326.96,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38126,
        "date": "2025-09-22",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38004,
        "date": "2025-09-22",
        "total_amount": 32,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 37900,
        "date": "2025-09-22",
        "total_amount": 100.28,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37999,
        "date": "2025-09-23",
        "total_amount": 11.66,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38003,
        "date": "2025-09-23",
        "total_amount": 3.88,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38002,
        "date": "2025-09-23",
        "total_amount": 4.74,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38001,
        "date": "2025-09-23",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7308,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Great Clips"
        }
      },
      {
        "id": 38000,
        "date": "2025-09-23",
        "total_amount": 32.27,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38007,
        "date": "2025-09-24",
        "total_amount": 18.36,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39149,
        "date": "2025-09-24",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37897,
        "date": "2025-09-24",
        "total_amount": 27.33,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 38008,
        "date": "2025-09-24",
        "total_amount": 14.55,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37998,
        "date": "2025-09-24",
        "total_amount": 45.23,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 37896,
        "date": "2025-09-24",
        "total_amount": 8.45,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37996,
        "date": "2025-09-25",
        "total_amount": 8.85,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37995,
        "date": "2025-09-25",
        "total_amount": 29.87,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37997,
        "date": "2025-09-25",
        "total_amount": 260.09,
        "transaction_type": "expense",
        "merchant_group_id": 7365,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Autozone"
        }
      },
      {
        "id": 37994,
        "date": "2025-09-26",
        "total_amount": 33.02,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 37895,
        "date": "2025-09-26",
        "total_amount": 40.16,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37894,
        "date": "2025-09-26",
        "total_amount": 31.25,
        "transaction_type": "expense",
        "merchant_group_id": 7297,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Power Homeschool"
        }
      },
      {
        "id": 37893,
        "date": "2025-09-27",
        "total_amount": 4.49,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 37992,
        "date": "2025-09-27",
        "total_amount": 20.08,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37993,
        "date": "2025-09-27",
        "total_amount": 3.5,
        "transaction_type": "expense",
        "merchant_group_id": 7319,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Church"
        }
      },
      {
        "id": 37889,
        "date": "2025-09-28",
        "total_amount": 5.4,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37890,
        "date": "2025-09-28",
        "total_amount": 17.46,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37892,
        "date": "2025-09-28",
        "total_amount": 14.03,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 37891,
        "date": "2025-09-28",
        "total_amount": 20.64,
        "transaction_type": "expense",
        "merchant_group_id": 7364,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Publix"
        }
      },
      {
        "id": 37744,
        "date": "2025-09-29",
        "total_amount": 106.16,
        "transaction_type": "expense",
        "merchant_group_id": 7481,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Home Depot"
        }
      },
      {
        "id": 37888,
        "date": "2025-09-29",
        "total_amount": 14.95,
        "transaction_type": "expense",
        "merchant_group_id": 7317,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Audible"
        }
      },
      {
        "id": 37887,
        "date": "2025-09-29",
        "total_amount": 3.01,
        "transaction_type": "expense",
        "merchant_group_id": 7309,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Bojangles"
        }
      },
      {
        "id": 39147,
        "date": "2025-09-29",
        "total_amount": 7000,
        "transaction_type": "expense",
        "merchant_group_id": 7397,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch..."
        }
      },
      {
        "id": 39148,
        "date": "2025-09-29",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39162,
        "date": "2025-09-29",
        "total_amount": 1409.41,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37494,
        "date": "2025-09-29",
        "total_amount": 83.33,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38125,
        "date": "2025-09-29",
        "total_amount": 7000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37986,
        "date": "2025-09-29",
        "total_amount": 10.44,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37987,
        "date": "2025-09-29",
        "total_amount": 120,
        "transaction_type": "expense",
        "merchant_group_id": 7305,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roller Time Family Skate Center Of Easley"
        }
      },
      {
        "id": 37988,
        "date": "2025-09-29",
        "total_amount": 687.48,
        "transaction_type": "expense",
        "merchant_group_id": 7437,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville County"
        }
      },
      {
        "id": 37990,
        "date": "2025-09-29",
        "total_amount": 10.64,
        "transaction_type": "expense",
        "merchant_group_id": 7437,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville County"
        }
      },
      {
        "id": 37991,
        "date": "2025-09-29",
        "total_amount": 330.18,
        "transaction_type": "expense",
        "merchant_group_id": 7437,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville County"
        }
      },
      {
        "id": 37984,
        "date": "2025-09-30",
        "total_amount": 56.49,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37985,
        "date": "2025-09-30",
        "total_amount": 8.24,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37885,
        "date": "2025-10-01",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": 7316,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "WCG Accounting"
        }
      },
      {
        "id": 38806,
        "date": "2025-10-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37884,
        "date": "2025-10-01",
        "total_amount": 6.48,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 39146,
        "date": "2025-10-01",
        "total_amount": 600.76,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 37836,
        "date": "2025-10-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38815,
        "date": "2025-10-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39169,
        "date": "2025-10-01",
        "total_amount": 1166.18,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37851,
        "date": "2025-10-01",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37886,
        "date": "2025-10-01",
        "total_amount": 511.29,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 37848,
        "date": "2025-10-01",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38123,
        "date": "2025-10-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38124,
        "date": "2025-10-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37846,
        "date": "2025-10-01",
        "total_amount": 14145.69,
        "transaction_type": "expense",
        "merchant_group_id": 7444,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Flagstar Bank"
        }
      },
      {
        "id": 37983,
        "date": "2025-10-02",
        "total_amount": 84.95,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39145,
        "date": "2025-10-02",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37845,
        "date": "2025-10-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 37980,
        "date": "2025-10-02",
        "total_amount": 29.69,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 37981,
        "date": "2025-10-02",
        "total_amount": 3.01,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37982,
        "date": "2025-10-02",
        "total_amount": 14.68,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37817,
        "date": "2025-10-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 37878,
        "date": "2025-10-03",
        "total_amount": 3998.02,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37979,
        "date": "2025-10-03",
        "total_amount": 23.5,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37978,
        "date": "2025-10-03",
        "total_amount": 20.6,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38039,
        "date": "2025-10-04",
        "total_amount": 433.38,
        "transaction_type": "expense",
        "merchant_group_id": 7301,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Optavia"
        }
      },
      {
        "id": 38037,
        "date": "2025-10-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 38114,
        "date": "2025-10-05",
        "total_amount": 27,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38038,
        "date": "2025-10-05",
        "total_amount": 9.38,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37977,
        "date": "2025-10-06",
        "total_amount": 7.47,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 39144,
        "date": "2025-10-06",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38113,
        "date": "2025-10-06",
        "total_amount": 6.35,
        "transaction_type": "expense",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 39160,
        "date": "2025-10-06",
        "total_amount": 1843,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38036,
        "date": "2025-10-06",
        "total_amount": 1.32,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38035,
        "date": "2025-10-06",
        "total_amount": 7,
        "transaction_type": "expense",
        "merchant_group_id": 7306,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Miracle Hill"
        }
      },
      {
        "id": 37844,
        "date": "2025-10-06",
        "total_amount": 2924.77,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37973,
        "date": "2025-10-06",
        "total_amount": 1.73,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37974,
        "date": "2025-10-06",
        "total_amount": 2.61,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 37975,
        "date": "2025-10-06",
        "total_amount": 1,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37976,
        "date": "2025-10-06",
        "total_amount": 10.7,
        "transaction_type": "expense",
        "merchant_group_id": 7305,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roller Time Family Skate Center Of Easley"
        }
      },
      {
        "id": 37971,
        "date": "2025-10-07",
        "total_amount": 10.12,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 37969,
        "date": "2025-10-07",
        "total_amount": 35.04,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37968,
        "date": "2025-10-07",
        "total_amount": 95.48,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37972,
        "date": "2025-10-07",
        "total_amount": 8.2,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38032,
        "date": "2025-10-07",
        "total_amount": 45.72,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38033,
        "date": "2025-10-07",
        "total_amount": 10.25,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38034,
        "date": "2025-10-07",
        "total_amount": 3107.64,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37816,
        "date": "2025-10-07",
        "total_amount": 169.2,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39977,
        "date": "2025-10-07",
        "total_amount": 240.71,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38780,
        "date": "2025-10-07",
        "total_amount": 169.2,
        "transaction_type": "expense",
        "merchant_group_id": 7375,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0v7bklny To Signify Business Essent..."
        }
      },
      {
        "id": 37568,
        "date": "2025-10-07",
        "total_amount": 1200,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37970,
        "date": "2025-10-07",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7312,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Fins Car Wash"
        }
      },
      {
        "id": 37962,
        "date": "2025-10-08",
        "total_amount": 80.2,
        "transaction_type": "expense",
        "merchant_group_id": 7299,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Restoration Family Cosmetic Dentistry"
        }
      },
      {
        "id": 37963,
        "date": "2025-10-08",
        "total_amount": 18.54,
        "transaction_type": "expense",
        "merchant_group_id": 7295,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hurricane Express Wash"
        }
      },
      {
        "id": 37964,
        "date": "2025-10-08",
        "total_amount": 5.93,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37967,
        "date": "2025-10-08",
        "total_amount": 22.95,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37842,
        "date": "2025-10-08",
        "total_amount": 3107.64,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37965,
        "date": "2025-10-08",
        "total_amount": 5.39,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37966,
        "date": "2025-10-08",
        "total_amount": 18.31,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37843,
        "date": "2025-10-08",
        "total_amount": 240.71,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39143,
        "date": "2025-10-08",
        "total_amount": 1200,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 37961,
        "date": "2025-10-08",
        "total_amount": 6.94,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37957,
        "date": "2025-10-09",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7368,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood"
        }
      },
      {
        "id": 37958,
        "date": "2025-10-09",
        "total_amount": 30.38,
        "transaction_type": "expense",
        "merchant_group_id": 7447,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Grandads Apples Hendersonville NC"
        }
      },
      {
        "id": 37959,
        "date": "2025-10-09",
        "total_amount": 1362.53,
        "transaction_type": "expense",
        "merchant_group_id": 7445,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Fred Anderson Toyota Of Greer"
        }
      },
      {
        "id": 37841,
        "date": "2025-10-09",
        "total_amount": 30.16,
        "transaction_type": "expense",
        "merchant_group_id": 7449,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Lowes Credit Card"
        }
      },
      {
        "id": 37955,
        "date": "2025-10-09",
        "total_amount": 6.99,
        "transaction_type": "expense",
        "merchant_group_id": 7363,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Food Lion"
        }
      },
      {
        "id": 37956,
        "date": "2025-10-09",
        "total_amount": 14.02,
        "transaction_type": "expense",
        "merchant_group_id": 7310,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dominos"
        }
      },
      {
        "id": 37581,
        "date": "2025-10-09",
        "total_amount": 6.94,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37960,
        "date": "2025-10-09",
        "total_amount": 7.41,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37617,
        "date": "2025-10-10",
        "total_amount": 250,
        "transaction_type": "expense",
        "merchant_group_id": 7438,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wealthfront Deposits"
        }
      },
      {
        "id": 37953,
        "date": "2025-10-10",
        "total_amount": 40.73,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 37952,
        "date": "2025-10-10",
        "total_amount": 4.47,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37954,
        "date": "2025-10-10",
        "total_amount": 5.81,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37947,
        "date": "2025-10-11",
        "total_amount": 6.35,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37949,
        "date": "2025-10-11",
        "total_amount": 10.59,
        "transaction_type": "expense",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 37951,
        "date": "2025-10-11",
        "total_amount": 8.25,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37546,
        "date": "2025-10-11",
        "total_amount": 225.47,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37946,
        "date": "2025-10-11",
        "total_amount": 4.96,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37948,
        "date": "2025-10-11",
        "total_amount": 8.85,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 37944,
        "date": "2025-10-12",
        "total_amount": 1.4,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 37943,
        "date": "2025-10-12",
        "total_amount": 12.17,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37945,
        "date": "2025-10-12",
        "total_amount": 68.89,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38031,
        "date": "2025-10-12",
        "total_amount": 46.44,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37940,
        "date": "2025-10-13",
        "total_amount": 10.7,
        "transaction_type": "expense",
        "merchant_group_id": 7305,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roller Time Family Skate Center Of Easley"
        }
      },
      {
        "id": 37942,
        "date": "2025-10-13",
        "total_amount": 12,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 37941,
        "date": "2025-10-13",
        "total_amount": 44.82,
        "transaction_type": "expense",
        "merchant_group_id": 7330,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "VGo"
        }
      },
      {
        "id": 37939,
        "date": "2025-10-13",
        "total_amount": 2.61,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 38029,
        "date": "2025-10-14",
        "total_amount": 0.43,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37840,
        "date": "2025-10-14",
        "total_amount": 74.13,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37839,
        "date": "2025-10-14",
        "total_amount": 122.77,
        "transaction_type": "expense",
        "merchant_group_id": 7324,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Rewards"
        }
      },
      {
        "id": 39142,
        "date": "2025-10-14",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38028,
        "date": "2025-10-14",
        "total_amount": 14.56,
        "transaction_type": "expense",
        "merchant_group_id": 7332,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "City BBQ"
        }
      },
      {
        "id": 38030,
        "date": "2025-10-14",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38026,
        "date": "2025-10-15",
        "total_amount": 71.73,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39159,
        "date": "2025-10-15",
        "total_amount": 1032.08,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39174,
        "date": "2025-10-15",
        "total_amount": 550,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38027,
        "date": "2025-10-15",
        "total_amount": 4365.78,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37545,
        "date": "2025-10-16",
        "total_amount": 12.92,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38025,
        "date": "2025-10-16",
        "total_amount": 5.39,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 38041,
        "date": "2025-10-16",
        "total_amount": 211.82,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 37580,
        "date": "2025-10-16",
        "total_amount": 4365.78,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37835,
        "date": "2025-10-16",
        "total_amount": 108.56,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37718,
        "date": "2025-10-16",
        "total_amount": 24.97,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38024,
        "date": "2025-10-17",
        "total_amount": 25.04,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 37756,
        "date": "2025-10-17",
        "total_amount": 40.18,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38122,
        "date": "2025-10-17",
        "total_amount": 4.7,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37276,
        "date": "2025-10-17",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7551,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Tmobile Auto Pay Bellevue Wa"
        }
      },
      {
        "id": 38040,
        "date": "2025-10-17",
        "total_amount": 3998.02,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37755,
        "date": "2025-10-18",
        "total_amount": 6.47,
        "transaction_type": "expense",
        "merchant_group_id": 7304,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hardees"
        }
      },
      {
        "id": 37726,
        "date": "2025-10-19",
        "total_amount": 3.88,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37754,
        "date": "2025-10-19",
        "total_amount": 117.94,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37710,
        "date": "2025-10-19",
        "total_amount": 63.17,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 37725,
        "date": "2025-10-20",
        "total_amount": 5.93,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37618,
        "date": "2025-10-20",
        "total_amount": 3.2,
        "transaction_type": "expense",
        "merchant_group_id": 7326,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Disney Plus"
        }
      },
      {
        "id": 37628,
        "date": "2025-10-20",
        "total_amount": 4365.78,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 37629,
        "date": "2025-10-20",
        "total_amount": 42.39,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37664,
        "date": "2025-10-20",
        "total_amount": 1.72,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 39170,
        "date": "2025-10-20",
        "total_amount": 1277.81,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39141,
        "date": "2025-10-20",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37544,
        "date": "2025-10-21",
        "total_amount": 54.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37753,
        "date": "2025-10-21",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37724,
        "date": "2025-10-22",
        "total_amount": 9.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 39140,
        "date": "2025-10-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 37642,
        "date": "2025-10-22",
        "total_amount": 15.1,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37752,
        "date": "2025-10-22",
        "total_amount": 4.63,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 38984,
        "date": "2025-10-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38985,
        "date": "2025-10-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39139,
        "date": "2025-10-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 37722,
        "date": "2025-10-23",
        "total_amount": 40.49,
        "transaction_type": "expense",
        "merchant_group_id": 7303,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "7 Eleven"
        }
      },
      {
        "id": 37641,
        "date": "2025-10-23",
        "total_amount": 8.63,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37731,
        "date": "2025-10-23",
        "total_amount": 14.99,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37723,
        "date": "2025-10-23",
        "total_amount": 2.5,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37640,
        "date": "2025-10-24",
        "total_amount": 3.54,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37730,
        "date": "2025-10-24",
        "total_amount": 14.66,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 38109,
        "date": "2025-10-24",
        "total_amount": 300,
        "transaction_type": "expense",
        "merchant_group_id": 7369,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cash Withdrawal In Branch"
        }
      },
      {
        "id": 37719,
        "date": "2025-10-25",
        "total_amount": 36.03,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 37729,
        "date": "2025-10-25",
        "total_amount": 43.24,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37639,
        "date": "2025-10-25",
        "total_amount": 17.42,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37721,
        "date": "2025-10-25",
        "total_amount": 5.16,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 37728,
        "date": "2025-10-25",
        "total_amount": 7.98,
        "transaction_type": "expense",
        "merchant_group_id": 7321,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Smoothie King"
        }
      },
      {
        "id": 37727,
        "date": "2025-10-26",
        "total_amount": 10.25,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37637,
        "date": "2025-10-26",
        "total_amount": 93.53,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37638,
        "date": "2025-10-26",
        "total_amount": 10.25,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37623,
        "date": "2025-10-27",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37624,
        "date": "2025-10-27",
        "total_amount": 90,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37766,
        "date": "2025-10-27",
        "total_amount": 5.21,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 37767,
        "date": "2025-10-27",
        "total_amount": 21.4,
        "transaction_type": "expense",
        "merchant_group_id": 7305,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roller Time Family Skate Center Of Easley"
        }
      },
      {
        "id": 37768,
        "date": "2025-10-27",
        "total_amount": 3.11,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 39167,
        "date": "2025-10-27",
        "total_amount": 1277.84,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37765,
        "date": "2025-10-28",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37543,
        "date": "2025-10-29",
        "total_amount": 52.12,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37799,
        "date": "2025-10-29",
        "total_amount": 7.56,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37763,
        "date": "2025-10-29",
        "total_amount": 31.25,
        "transaction_type": "expense",
        "merchant_group_id": 7297,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Power Homeschool"
        }
      },
      {
        "id": 37764,
        "date": "2025-10-29",
        "total_amount": 16,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 37789,
        "date": "2025-10-30",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 37762,
        "date": "2025-10-30",
        "total_amount": 11.41,
        "transaction_type": "expense",
        "merchant_group_id": 7370,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Once Upon A Child"
        }
      },
      {
        "id": 37788,
        "date": "2025-10-30",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39173,
        "date": "2025-10-30",
        "total_amount": 1130.67,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37758,
        "date": "2025-10-30",
        "total_amount": 7.44,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 39055,
        "date": "2025-10-31",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 263,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 37787,
        "date": "2025-10-31",
        "total_amount": 3935.33,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39905,
        "date": "2025-11-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37421,
        "date": "2025-11-01",
        "total_amount": 14.8,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37828,
        "date": "2025-11-01",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": 7316,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "WCG Accounting"
        }
      },
      {
        "id": 37422,
        "date": "2025-11-01",
        "total_amount": 4.7,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37420,
        "date": "2025-11-01",
        "total_amount": 11.1,
        "transaction_type": "expense",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 38782,
        "date": "2025-11-01",
        "total_amount": 105.6,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37829,
        "date": "2025-11-01",
        "total_amount": 511.29,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 37419,
        "date": "2025-11-01",
        "total_amount": 17.25,
        "transaction_type": "expense",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 37418,
        "date": "2025-11-01",
        "total_amount": 3.23,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 37417,
        "date": "2025-11-02",
        "total_amount": 3.54,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 38809,
        "date": "2025-11-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38363,
        "date": "2025-11-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39168,
        "date": "2025-11-03",
        "total_amount": 1277.79,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39138,
        "date": "2025-11-03",
        "total_amount": 600.76,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 37769,
        "date": "2025-11-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38426,
        "date": "2025-11-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37416,
        "date": "2025-11-03",
        "total_amount": 135.4,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37414,
        "date": "2025-11-03",
        "total_amount": 47.9,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37415,
        "date": "2025-11-03",
        "total_amount": 14.99,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38429,
        "date": "2025-11-03",
        "total_amount": 70,
        "transaction_type": "income",
        "merchant_group_id": 7440,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 37774,
        "date": "2025-11-03",
        "total_amount": 70,
        "transaction_type": "expense",
        "merchant_group_id": 7440,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Venmo Jonathan Wadsworth"
        }
      },
      {
        "id": 38437,
        "date": "2025-11-03",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37413,
        "date": "2025-11-03",
        "total_amount": 5.39,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38758,
        "date": "2025-11-03",
        "total_amount": 105.6,
        "transaction_type": "expense",
        "merchant_group_id": 7527,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0vjhhyr2 To Signify Business Essent..."
        }
      },
      {
        "id": 37535,
        "date": "2025-11-03",
        "total_amount": 103.88,
        "transaction_type": "expense",
        "merchant_group_id": 7387,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart Plus"
        }
      },
      {
        "id": 38241,
        "date": "2025-11-03",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38428,
        "date": "2025-11-04",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39165,
        "date": "2025-11-04",
        "total_amount": 38,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37412,
        "date": "2025-11-04",
        "total_amount": 43.04,
        "transaction_type": "expense",
        "merchant_group_id": 7452,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "76 Petroleum"
        }
      },
      {
        "id": 39127,
        "date": "2025-11-05",
        "total_amount": 38,
        "transaction_type": "expense",
        "merchant_group_id": 7538,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0ptvj6j6 Everyday Ch..."
        }
      },
      {
        "id": 37411,
        "date": "2025-11-05",
        "total_amount": 9.32,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37410,
        "date": "2025-11-05",
        "total_amount": 18,
        "transaction_type": "expense",
        "merchant_group_id": 7295,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hurricane Express Wash"
        }
      },
      {
        "id": 37409,
        "date": "2025-11-05",
        "total_amount": 6.26,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37792,
        "date": "2025-11-05",
        "total_amount": 38,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38427,
        "date": "2025-11-05",
        "total_amount": 2924.77,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39129,
        "date": "2025-11-05",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39128,
        "date": "2025-11-05",
        "total_amount": 659.38,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 38450,
        "date": "2025-11-05",
        "total_amount": 38,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37407,
        "date": "2025-11-05",
        "total_amount": 4.96,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 37408,
        "date": "2025-11-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 37405,
        "date": "2025-11-06",
        "total_amount": 52.85,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37404,
        "date": "2025-11-06",
        "total_amount": 5.19,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37403,
        "date": "2025-11-06",
        "total_amount": 5,
        "transaction_type": "expense",
        "merchant_group_id": 7313,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Harris Teeter"
        }
      },
      {
        "id": 37406,
        "date": "2025-11-06",
        "total_amount": 433.38,
        "transaction_type": "expense",
        "merchant_group_id": 7301,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Optavia"
        }
      },
      {
        "id": 37399,
        "date": "2025-11-07",
        "total_amount": 5.77,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38138,
        "date": "2025-11-07",
        "total_amount": 345.5,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 37397,
        "date": "2025-11-07",
        "total_amount": 5.98,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 37400,
        "date": "2025-11-07",
        "total_amount": 5.77,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37398,
        "date": "2025-11-07",
        "total_amount": 13.77,
        "transaction_type": "expense",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 37402,
        "date": "2025-11-07",
        "total_amount": 6.99,
        "transaction_type": "expense",
        "merchant_group_id": 7323,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Discount Grocery"
        }
      },
      {
        "id": 37401,
        "date": "2025-11-07",
        "total_amount": 29.98,
        "transaction_type": "expense",
        "merchant_group_id": 7331,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Original Harveys Family Restaurant"
        }
      },
      {
        "id": 37806,
        "date": "2025-11-07",
        "total_amount": 123.46,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37396,
        "date": "2025-11-08",
        "total_amount": 16.68,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 37395,
        "date": "2025-11-08",
        "total_amount": 14.52,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37394,
        "date": "2025-11-08",
        "total_amount": 35.16,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37393,
        "date": "2025-11-08",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7439,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "World Tang Soo Do Association"
        }
      },
      {
        "id": 39126,
        "date": "2025-11-10",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37534,
        "date": "2025-11-10",
        "total_amount": 1222.89,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39130,
        "date": "2025-11-10",
        "total_amount": 1533.57,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37391,
        "date": "2025-11-10",
        "total_amount": 69.31,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37390,
        "date": "2025-11-10",
        "total_amount": 38.31,
        "transaction_type": "expense",
        "merchant_group_id": 7452,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "76 Petroleum"
        }
      },
      {
        "id": 39125,
        "date": "2025-11-10",
        "total_amount": 345.5,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 37392,
        "date": "2025-11-10",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7308,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Great Clips"
        }
      },
      {
        "id": 37542,
        "date": "2025-11-11",
        "total_amount": 214.95,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37388,
        "date": "2025-11-11",
        "total_amount": 11.54,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37389,
        "date": "2025-11-11",
        "total_amount": 2.58,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37385,
        "date": "2025-11-12",
        "total_amount": 3.99,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 38425,
        "date": "2025-11-12",
        "total_amount": 1222.89,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 37387,
        "date": "2025-11-12",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37386,
        "date": "2025-11-12",
        "total_amount": 3.88,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37384,
        "date": "2025-11-12",
        "total_amount": 3.29,
        "transaction_type": "expense",
        "merchant_group_id": 7484,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Hobby Lobby"
        }
      },
      {
        "id": 37382,
        "date": "2025-11-13",
        "total_amount": 4.86,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 37383,
        "date": "2025-11-13",
        "total_amount": 2.66,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37380,
        "date": "2025-11-13",
        "total_amount": 20.92,
        "transaction_type": "expense",
        "merchant_group_id": 7291,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Local Cue"
        }
      },
      {
        "id": 37381,
        "date": "2025-11-13",
        "total_amount": 99.63,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39137,
        "date": "2025-11-13",
        "total_amount": 1988.5,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38100,
        "date": "2025-11-13",
        "total_amount": 214.95,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 37379,
        "date": "2025-11-14",
        "total_amount": 32.39,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 38424,
        "date": "2025-11-14",
        "total_amount": 3935.33,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 37378,
        "date": "2025-11-14",
        "total_amount": 24.63,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37785,
        "date": "2025-11-14",
        "total_amount": 3935.33,
        "transaction_type": "expense",
        "merchant_group_id": 7294,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38370,
        "date": "2025-11-14",
        "total_amount": 10.46,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37375,
        "date": "2025-11-15",
        "total_amount": 72.23,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37373,
        "date": "2025-11-15",
        "total_amount": 2.69,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37376,
        "date": "2025-11-15",
        "total_amount": 36.52,
        "transaction_type": "expense",
        "merchant_group_id": 7492,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Carowinds"
        }
      },
      {
        "id": 37446,
        "date": "2025-11-15",
        "total_amount": 2.48,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37377,
        "date": "2025-11-15",
        "total_amount": 20,
        "transaction_type": "expense",
        "merchant_group_id": 7303,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "7 Eleven"
        }
      },
      {
        "id": 37374,
        "date": "2025-11-15",
        "total_amount": 2.82,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 37578,
        "date": "2025-11-16",
        "total_amount": 2.66,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37577,
        "date": "2025-11-16",
        "total_amount": 7.34,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 37579,
        "date": "2025-11-16",
        "total_amount": 1.07,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 39132,
        "date": "2025-11-17",
        "total_amount": 1439.48,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37573,
        "date": "2025-11-17",
        "total_amount": 78.85,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37572,
        "date": "2025-11-17",
        "total_amount": 105,
        "transaction_type": "expense",
        "merchant_group_id": 7289,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Usps"
        }
      },
      {
        "id": 37576,
        "date": "2025-11-17",
        "total_amount": 7.75,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37575,
        "date": "2025-11-17",
        "total_amount": 9.94,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38423,
        "date": "2025-11-17",
        "total_amount": 163.09,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 38098,
        "date": "2025-11-17",
        "total_amount": 40.18,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 37574,
        "date": "2025-11-17",
        "total_amount": 5.28,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38251,
        "date": "2025-11-17",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7551,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Tmobile Auto Pay Bellevue Wa"
        }
      },
      {
        "id": 39124,
        "date": "2025-11-17",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38045,
        "date": "2025-11-18",
        "total_amount": 21.4,
        "transaction_type": "expense",
        "merchant_group_id": 7305,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Roller Time Family Skate Center Of Easley"
        }
      },
      {
        "id": 38105,
        "date": "2025-11-18",
        "total_amount": 115.54,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 37931,
        "date": "2025-11-18",
        "total_amount": 3.11,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 37932,
        "date": "2025-11-18",
        "total_amount": 2.61,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 37826,
        "date": "2025-11-18",
        "total_amount": 2340.61,
        "transaction_type": "expense",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38099,
        "date": "2025-11-18",
        "total_amount": 45.02,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37824,
        "date": "2025-11-19",
        "total_amount": 15.85,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37784,
        "date": "2025-11-19",
        "total_amount": 30.94,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 37436,
        "date": "2025-11-19",
        "total_amount": 11.32,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37825,
        "date": "2025-11-19",
        "total_amount": 5.73,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 37783,
        "date": "2025-11-20",
        "total_amount": 2,
        "transaction_type": "expense",
        "merchant_group_id": 7334,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Pivot Heritage Green"
        }
      },
      {
        "id": 37782,
        "date": "2025-11-20",
        "total_amount": 14.68,
        "transaction_type": "expense",
        "merchant_group_id": 7348,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Firehouse Subs"
        }
      },
      {
        "id": 37335,
        "date": "2025-11-20",
        "total_amount": 2340.61,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 37277,
        "date": "2025-11-20",
        "total_amount": 52.98,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37804,
        "date": "2025-11-20",
        "total_amount": 3.17,
        "transaction_type": "expense",
        "merchant_group_id": 7326,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Disney Plus"
        }
      },
      {
        "id": 37541,
        "date": "2025-11-21",
        "total_amount": 54.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37779,
        "date": "2025-11-21",
        "total_amount": 46.75,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 37776,
        "date": "2025-11-21",
        "total_amount": 3.13,
        "transaction_type": "expense",
        "merchant_group_id": 7409,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Bath & Body Works"
        }
      },
      {
        "id": 37777,
        "date": "2025-11-21",
        "total_amount": 3.71,
        "transaction_type": "expense",
        "merchant_group_id": 7333,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Marshalls"
        }
      },
      {
        "id": 37778,
        "date": "2025-11-21",
        "total_amount": 58.52,
        "transaction_type": "expense",
        "merchant_group_id": 7505,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Red Robin"
        }
      },
      {
        "id": 37741,
        "date": "2025-11-22",
        "total_amount": 12.94,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 37740,
        "date": "2025-11-22",
        "total_amount": 55.74,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37775,
        "date": "2025-11-22",
        "total_amount": 6.85,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 37736,
        "date": "2025-11-23",
        "total_amount": 2.66,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 37738,
        "date": "2025-11-23",
        "total_amount": 43.18,
        "transaction_type": "expense",
        "merchant_group_id": 7371,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Papa Johns"
        }
      },
      {
        "id": 37739,
        "date": "2025-11-23",
        "total_amount": 17.96,
        "transaction_type": "expense",
        "merchant_group_id": 7385,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Ingles Markets"
        }
      },
      {
        "id": 38097,
        "date": "2025-11-23",
        "total_amount": 54.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 37737,
        "date": "2025-11-23",
        "total_amount": 2,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 37328,
        "date": "2025-11-24",
        "total_amount": 5000.3,
        "transaction_type": "expense",
        "merchant_group_id": 7320,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch.com"
        }
      },
      {
        "id": 37732,
        "date": "2025-11-24",
        "total_amount": 5.61,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39122,
        "date": "2025-11-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39121,
        "date": "2025-11-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39123,
        "date": "2025-11-24",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": 7538,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer To Wadsworth J Ref Ib0ptvj6j6 Everyday Ch..."
        }
      },
      {
        "id": 38253,
        "date": "2025-11-24",
        "total_amount": 10.46,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 37734,
        "date": "2025-11-24",
        "total_amount": 149,
        "transaction_type": "expense",
        "merchant_group_id": 7386,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Prisma Health Urgent"
        }
      },
      {
        "id": 39133,
        "date": "2025-11-24",
        "total_amount": 1634.43,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37735,
        "date": "2025-11-24",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7514,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Wikimedia"
        }
      },
      {
        "id": 37327,
        "date": "2025-11-24",
        "total_amount": 5000,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 37733,
        "date": "2025-11-24",
        "total_amount": 23.09,
        "transaction_type": "expense",
        "merchant_group_id": 7511,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "CVS Pharmacy"
        }
      },
      {
        "id": 38982,
        "date": "2025-11-24",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 38983,
        "date": "2025-11-24",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 37330,
        "date": "2025-11-25",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7384,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Passport Services"
        }
      },
      {
        "id": 39120,
        "date": "2025-11-25",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 37611,
        "date": "2025-11-25",
        "total_amount": 1232.79,
        "transaction_type": "expense",
        "merchant_group_id": 7307,
        "account_id": null,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Allstate"
        }
      },
      {
        "id": 37329,
        "date": "2025-11-25",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7384,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Passport Services"
        }
      },
      {
        "id": 38361,
        "date": "2025-11-25",
        "total_amount": 10,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 38362,
        "date": "2025-11-25",
        "total_amount": 39.58,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37331,
        "date": "2025-11-25",
        "total_amount": 100,
        "transaction_type": "expense",
        "merchant_group_id": 7384,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Passport Services"
        }
      },
      {
        "id": 40009,
        "date": "2025-11-25",
        "total_amount": 129.34,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38357,
        "date": "2025-11-26",
        "total_amount": 5.56,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38359,
        "date": "2025-11-26",
        "total_amount": 70.4,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38360,
        "date": "2025-11-26",
        "total_amount": 10.6,
        "transaction_type": "expense",
        "merchant_group_id": 7411,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Ulta"
        }
      },
      {
        "id": 38358,
        "date": "2025-11-26",
        "total_amount": 9.64,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 39136,
        "date": "2025-11-26",
        "total_amount": 963,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38354,
        "date": "2025-11-26",
        "total_amount": 78.51,
        "transaction_type": "expense",
        "merchant_group_id": 7513,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Shein"
        }
      },
      {
        "id": 38355,
        "date": "2025-11-26",
        "total_amount": 8.15,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38356,
        "date": "2025-11-26",
        "total_amount": 5.39,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 38353,
        "date": "2025-11-27",
        "total_amount": 31.25,
        "transaction_type": "expense",
        "merchant_group_id": 7297,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Power Homeschool"
        }
      },
      {
        "id": 38350,
        "date": "2025-11-28",
        "total_amount": 16.9,
        "transaction_type": "expense",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 38422,
        "date": "2025-11-28",
        "total_amount": 4650.74,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 38351,
        "date": "2025-11-28",
        "total_amount": 17.96,
        "transaction_type": "expense",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 38352,
        "date": "2025-11-28",
        "total_amount": 31.8,
        "transaction_type": "expense",
        "merchant_group_id": 7357,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Target"
        }
      },
      {
        "id": 38805,
        "date": "2025-11-28",
        "total_amount": 0.01,
        "transaction_type": "income",
        "merchant_group_id": 7443,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39131,
        "date": "2025-11-28",
        "total_amount": 1433.66,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38346,
        "date": "2025-11-29",
        "total_amount": 36.91,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 38344,
        "date": "2025-11-29",
        "total_amount": 39.91,
        "transaction_type": "expense",
        "merchant_group_id": 7482,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Five Below"
        }
      },
      {
        "id": 38347,
        "date": "2025-11-29",
        "total_amount": 44.17,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38348,
        "date": "2025-11-29",
        "total_amount": 13.72,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38349,
        "date": "2025-11-29",
        "total_amount": 10.35,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38345,
        "date": "2025-11-29",
        "total_amount": 7.35,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38104,
        "date": "2025-11-30",
        "total_amount": 29.05,
        "transaction_type": "expense",
        "merchant_group_id": 7413,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Classic Ace Hardware"
        }
      },
      {
        "id": 38341,
        "date": "2025-11-30",
        "total_amount": 0.59,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38342,
        "date": "2025-11-30",
        "total_amount": 14.96,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38343,
        "date": "2025-11-30",
        "total_amount": 11.84,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 38340,
        "date": "2025-11-30",
        "total_amount": 29.75,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38339,
        "date": "2025-11-30",
        "total_amount": 14.83,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39118,
        "date": "2025-12-01",
        "total_amount": 600.76,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 38430,
        "date": "2025-12-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38143,
        "date": "2025-12-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38814,
        "date": "2025-12-01",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39904,
        "date": "2025-12-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 38432,
        "date": "2025-12-01",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38087,
        "date": "2025-12-01",
        "total_amount": 10.59,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38274,
        "date": "2025-12-01",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": 7316,
        "account_id": null,
        "credit_card_id": 200,
        "merchant_groups": {
          "display_name": "WCG Accounting"
        }
      },
      {
        "id": 39860,
        "date": "2025-12-01",
        "total_amount": 305,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38337,
        "date": "2025-12-01",
        "total_amount": 6,
        "transaction_type": "expense",
        "merchant_group_id": 7388,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "City Of Greenville"
        }
      },
      {
        "id": 38338,
        "date": "2025-12-01",
        "total_amount": 14.03,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 39119,
        "date": "2025-12-01",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38454,
        "date": "2025-12-02",
        "total_amount": 500,
        "transaction_type": "expense",
        "merchant_group_id": 7319,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "North Hills Church"
        }
      },
      {
        "id": 38189,
        "date": "2025-12-02",
        "total_amount": 21.2,
        "transaction_type": "expense",
        "merchant_group_id": 7389,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Cursor Ai"
        }
      },
      {
        "id": 38254,
        "date": "2025-12-02",
        "total_amount": 926.03,
        "transaction_type": "expense",
        "merchant_group_id": 7415,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "United"
        }
      },
      {
        "id": 38255,
        "date": "2025-12-02",
        "total_amount": 926.03,
        "transaction_type": "expense",
        "merchant_group_id": 7415,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "United"
        }
      },
      {
        "id": 38256,
        "date": "2025-12-02",
        "total_amount": 926.03,
        "transaction_type": "expense",
        "merchant_group_id": 7415,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "United"
        }
      },
      {
        "id": 38257,
        "date": "2025-12-02",
        "total_amount": 926.03,
        "transaction_type": "expense",
        "merchant_group_id": 7415,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "United"
        }
      },
      {
        "id": 38258,
        "date": "2025-12-02",
        "total_amount": 926.03,
        "transaction_type": "expense",
        "merchant_group_id": 7415,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "United"
        }
      },
      {
        "id": 38259,
        "date": "2025-12-02",
        "total_amount": 926.03,
        "transaction_type": "expense",
        "merchant_group_id": 7415,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "United"
        }
      },
      {
        "id": 38364,
        "date": "2025-12-02",
        "total_amount": 31.47,
        "transaction_type": "expense",
        "merchant_group_id": 7488,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Regal Hollywood Cinemas"
        }
      },
      {
        "id": 38369,
        "date": "2025-12-02",
        "total_amount": 6.76,
        "transaction_type": "expense",
        "merchant_group_id": 7488,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Regal Hollywood Cinemas"
        }
      },
      {
        "id": 38418,
        "date": "2025-12-02",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38419,
        "date": "2025-12-02",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 38420,
        "date": "2025-12-02",
        "total_amount": 50,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 38421,
        "date": "2025-12-02",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 38333,
        "date": "2025-12-03",
        "total_amount": 43.47,
        "transaction_type": "expense",
        "merchant_group_id": 7452,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "76 Petroleum"
        }
      },
      {
        "id": 38332,
        "date": "2025-12-03",
        "total_amount": 31.1,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38334,
        "date": "2025-12-03",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38106,
        "date": "2025-12-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 38331,
        "date": "2025-12-04",
        "total_amount": 59,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38330,
        "date": "2025-12-04",
        "total_amount": 5.39,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38329,
        "date": "2025-12-04",
        "total_amount": 26.02,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 38417,
        "date": "2025-12-05",
        "total_amount": 2924.77,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 37540,
        "date": "2025-12-05",
        "total_amount": 147.34,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38326,
        "date": "2025-12-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 37805,
        "date": "2025-12-05",
        "total_amount": 77.27,
        "transaction_type": "expense",
        "merchant_group_id": 7490,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Greenville Spartanburg Greer Sc"
        }
      },
      {
        "id": 37780,
        "date": "2025-12-05",
        "total_amount": 40.26,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 38324,
        "date": "2025-12-05",
        "total_amount": 14.35,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 38328,
        "date": "2025-12-05",
        "total_amount": 6.48,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 38325,
        "date": "2025-12-05",
        "total_amount": 541.09,
        "transaction_type": "expense",
        "merchant_group_id": 7417,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Airbnb"
        }
      },
      {
        "id": 38327,
        "date": "2025-12-05",
        "total_amount": 10.03,
        "transaction_type": "expense",
        "merchant_group_id": 7518,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Bob Jones University"
        }
      },
      {
        "id": 38470,
        "date": "2025-12-06",
        "total_amount": 276.66,
        "transaction_type": "expense",
        "merchant_group_id": 7500,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Lidl"
        }
      },
      {
        "id": 38322,
        "date": "2025-12-06",
        "total_amount": 37.1,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 38323,
        "date": "2025-12-06",
        "total_amount": 29.13,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38471,
        "date": "2025-12-06",
        "total_amount": 13.2,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38191,
        "date": "2025-12-07",
        "total_amount": 16.92,
        "transaction_type": "expense",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 38397,
        "date": "2025-12-07",
        "total_amount": 21.16,
        "transaction_type": "expense",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 37539,
        "date": "2025-12-07",
        "total_amount": 239.87,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38190,
        "date": "2025-12-07",
        "total_amount": 147.34,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38469,
        "date": "2025-12-07",
        "total_amount": 1172.31,
        "transaction_type": "expense",
        "merchant_group_id": 7420,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Travelocity"
        }
      },
      {
        "id": 38468,
        "date": "2025-12-07",
        "total_amount": 433.38,
        "transaction_type": "expense",
        "merchant_group_id": 7301,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Optavia"
        }
      },
      {
        "id": 38467,
        "date": "2025-12-07",
        "total_amount": 115.14,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 38398,
        "date": "2025-12-07",
        "total_amount": 21.16,
        "transaction_type": "income",
        "merchant_group_id": 7345,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Ross Dress For Less"
        }
      },
      {
        "id": 39134,
        "date": "2025-12-08",
        "total_amount": 1954.39,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38462,
        "date": "2025-12-09",
        "total_amount": 20.12,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 38466,
        "date": "2025-12-09",
        "total_amount": 1.32,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38463,
        "date": "2025-12-09",
        "total_amount": 12.7,
        "transaction_type": "expense",
        "merchant_group_id": 7484,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Hobby Lobby"
        }
      },
      {
        "id": 38867,
        "date": "2025-12-09",
        "total_amount": 43.84,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38464,
        "date": "2025-12-09",
        "total_amount": 2.66,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 38459,
        "date": "2025-12-10",
        "total_amount": 1.72,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38458,
        "date": "2025-12-10",
        "total_amount": 0.43,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38460,
        "date": "2025-12-10",
        "total_amount": 31.76,
        "transaction_type": "expense",
        "merchant_group_id": 7485,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Harbor Freight Tools"
        }
      },
      {
        "id": 39117,
        "date": "2025-12-10",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 38457,
        "date": "2025-12-10",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 38461,
        "date": "2025-12-10",
        "total_amount": 18.31,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 37538,
        "date": "2025-12-11",
        "total_amount": 223.37,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 39854,
        "date": "2025-12-11",
        "total_amount": 5.61,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 39855,
        "date": "2025-12-11",
        "total_amount": 3.88,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 37567,
        "date": "2025-12-11",
        "total_amount": 730.15,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 38433,
        "date": "2025-12-12",
        "total_amount": 228.88,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39853,
        "date": "2025-12-12",
        "total_amount": 2.15,
        "transaction_type": "expense",
        "merchant_group_id": 7371,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Papa Johns"
        }
      },
      {
        "id": 38499,
        "date": "2025-12-12",
        "total_amount": 4050.74,
        "transaction_type": "income",
        "merchant_group_id": 7294,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark"
        }
      },
      {
        "id": 39115,
        "date": "2025-12-12",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39116,
        "date": "2025-12-12",
        "total_amount": 200,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39851,
        "date": "2025-12-13",
        "total_amount": 2.37,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 39849,
        "date": "2025-12-13",
        "total_amount": 262,
        "transaction_type": "expense",
        "merchant_group_id": 7605,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mint 800 683 7392 Ca"
        }
      },
      {
        "id": 39850,
        "date": "2025-12-13",
        "total_amount": 6.57,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 39852,
        "date": "2025-12-13",
        "total_amount": 42.21,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 39841,
        "date": "2025-12-14",
        "total_amount": 33.38,
        "transaction_type": "expense",
        "merchant_group_id": 7597,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Kohl S 1473 Greer Sc"
        }
      },
      {
        "id": 39842,
        "date": "2025-12-14",
        "total_amount": 31.41,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39843,
        "date": "2025-12-14",
        "total_amount": 4.23,
        "transaction_type": "expense",
        "merchant_group_id": 7597,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Kohl S 1473 Greer Sc"
        }
      },
      {
        "id": 39844,
        "date": "2025-12-14",
        "total_amount": 7.42,
        "transaction_type": "expense",
        "merchant_group_id": 7482,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Five Below"
        }
      },
      {
        "id": 39845,
        "date": "2025-12-14",
        "total_amount": 7.33,
        "transaction_type": "expense",
        "merchant_group_id": 7617,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Subway 38209 Greenville Sc"
        }
      },
      {
        "id": 39846,
        "date": "2025-12-14",
        "total_amount": 12.01,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39847,
        "date": "2025-12-14",
        "total_amount": 54.97,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 39848,
        "date": "2025-12-14",
        "total_amount": 4.96,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 37537,
        "date": "2025-12-14",
        "total_amount": 31.78,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 39834,
        "date": "2025-12-15",
        "total_amount": 9.52,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39836,
        "date": "2025-12-15",
        "total_amount": 1.56,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39837,
        "date": "2025-12-15",
        "total_amount": 7.34,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 39838,
        "date": "2025-12-15",
        "total_amount": 121.22,
        "transaction_type": "expense",
        "merchant_group_id": 7338,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Express Tire Engineers"
        }
      },
      {
        "id": 39839,
        "date": "2025-12-15",
        "total_amount": 18,
        "transaction_type": "expense",
        "merchant_group_id": 7295,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Hurricane Express Wash"
        }
      },
      {
        "id": 39840,
        "date": "2025-12-15",
        "total_amount": 23.11,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39114,
        "date": "2025-12-15",
        "total_amount": 730.15,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 37566,
        "date": "2025-12-15",
        "total_amount": 10.59,
        "transaction_type": "income",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 37536,
        "date": "2025-12-15",
        "total_amount": 24,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39135,
        "date": "2025-12-15",
        "total_amount": 957.96,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 38453,
        "date": "2025-12-15",
        "total_amount": 360,
        "transaction_type": "expense",
        "merchant_group_id": 7369,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Cash Withdrawal In Branch"
        }
      },
      {
        "id": 38431,
        "date": "2025-12-15",
        "total_amount": 57.83,
        "transaction_type": "income",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39835,
        "date": "2025-12-15",
        "total_amount": 90.83,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39833,
        "date": "2025-12-16",
        "total_amount": 9.37,
        "transaction_type": "expense",
        "merchant_group_id": 7314,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Jack In The Box"
        }
      },
      {
        "id": 39832,
        "date": "2025-12-16",
        "total_amount": 5,
        "transaction_type": "expense",
        "merchant_group_id": 7599,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Greenville Parking Commongreenville Sc"
        }
      },
      {
        "id": 39508,
        "date": "2025-12-16",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39831,
        "date": "2025-12-16",
        "total_amount": 262,
        "transaction_type": "expense",
        "merchant_group_id": 7605,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mint 800 683 7392 Ca"
        }
      },
      {
        "id": 39893,
        "date": "2025-12-16",
        "total_amount": 31.78,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": undefined
      },
      {
        "id": 39514,
        "date": "2025-12-17",
        "total_amount": 255.86,
        "transaction_type": "expense",
        "merchant_group_id": 7527,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0vjhhyr2 To Signify Business Essent..."
        }
      },
      {
        "id": 39827,
        "date": "2025-12-17",
        "total_amount": 4794.01,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39828,
        "date": "2025-12-17",
        "total_amount": 58.3,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39829,
        "date": "2025-12-17",
        "total_amount": 52.6,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39830,
        "date": "2025-12-17",
        "total_amount": 12.41,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 39509,
        "date": "2025-12-17",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7551,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Tmobile Auto Pay Bellevue Wa"
        }
      },
      {
        "id": 39510,
        "date": "2025-12-17",
        "total_amount": 255.86,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39515,
        "date": "2025-12-17",
        "total_amount": 167.77,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 39824,
        "date": "2025-12-18",
        "total_amount": 2.28,
        "transaction_type": "expense",
        "merchant_group_id": 7604,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Huck S Food Fuel Sto Kuttawa Ky"
        }
      },
      {
        "id": 39825,
        "date": "2025-12-18",
        "total_amount": 40.06,
        "transaction_type": "expense",
        "merchant_group_id": 7612,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Tst Hi Pointe Chesterfie Chesterfield Mo"
        }
      },
      {
        "id": 39210,
        "date": "2025-12-18",
        "total_amount": 21.22,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": undefined
      },
      {
        "id": 39826,
        "date": "2025-12-18",
        "total_amount": 11.09,
        "transaction_type": "expense",
        "merchant_group_id": 7363,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Food Lion"
        }
      },
      {
        "id": 39819,
        "date": "2025-12-18",
        "total_amount": 11.83,
        "transaction_type": "expense",
        "merchant_group_id": 7598,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonald S F12644 Mt Juliet Tn"
        }
      },
      {
        "id": 39814,
        "date": "2025-12-19",
        "total_amount": 35.02,
        "transaction_type": "expense",
        "merchant_group_id": 7616,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Sams Club 4946 Rocky Mount Nc"
        }
      },
      {
        "id": 39513,
        "date": "2025-12-19",
        "total_amount": 4794.01,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 39818,
        "date": "2025-12-19",
        "total_amount": 5.26,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39817,
        "date": "2025-12-19",
        "total_amount": 52.77,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39816,
        "date": "2025-12-19",
        "total_amount": 6.49,
        "transaction_type": "expense",
        "merchant_group_id": 7609,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Hy Vee Lee S Summit 1381 Lee S Summit Mo"
        }
      },
      {
        "id": 39815,
        "date": "2025-12-19",
        "total_amount": 24.6,
        "transaction_type": "expense",
        "merchant_group_id": 7603,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Jackstackbarbecue Www Jackstackmo"
        }
      },
      {
        "id": 39823,
        "date": "2025-12-19",
        "total_amount": 81.75,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": undefined
      },
      {
        "id": 38739,
        "date": "2025-12-21",
        "total_amount": 74.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 39812,
        "date": "2025-12-21",
        "total_amount": 3.28,
        "transaction_type": "expense",
        "merchant_group_id": 7598,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonald S F12644 Mt Juliet Tn"
        }
      },
      {
        "id": 39872,
        "date": "2025-12-21",
        "total_amount": 4.14,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": undefined
      },
      {
        "id": 39811,
        "date": "2025-12-21",
        "total_amount": 4.37,
        "transaction_type": "expense",
        "merchant_group_id": 7611,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dierbergs Green Mnt Shiloh Il"
        }
      },
      {
        "id": 39810,
        "date": "2025-12-21",
        "total_amount": 2.07,
        "transaction_type": "expense",
        "merchant_group_id": 7496,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Loves"
        }
      },
      {
        "id": 39822,
        "date": "2025-12-21",
        "total_amount": 36.85,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": undefined
      },
      {
        "id": 39813,
        "date": "2025-12-21",
        "total_amount": 1.64,
        "transaction_type": "expense",
        "merchant_group_id": 7598,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonald S F12644 Mt Juliet Tn"
        }
      },
      {
        "id": 39808,
        "date": "2025-12-22",
        "total_amount": 31.41,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39821,
        "date": "2025-12-22",
        "total_amount": 3.99,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": undefined
      },
      {
        "id": 39809,
        "date": "2025-12-22",
        "total_amount": 44.38,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39506,
        "date": "2025-12-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39507,
        "date": "2025-12-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39919,
        "date": "2025-12-23",
        "total_amount": 7,
        "transaction_type": "expense",
        "merchant_group_id": 7553,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Gw Sc Greer Greer"
        }
      },
      {
        "id": 39803,
        "date": "2025-12-23",
        "total_amount": 5,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 39805,
        "date": "2025-12-23",
        "total_amount": 32.24,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39806,
        "date": "2025-12-23",
        "total_amount": 29.34,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39807,
        "date": "2025-12-23",
        "total_amount": 30.19,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39526,
        "date": "2025-12-23",
        "total_amount": 3015.49,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39802,
        "date": "2025-12-23",
        "total_amount": 14.75,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 39804,
        "date": "2025-12-23",
        "total_amount": 39.77,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 39800,
        "date": "2025-12-24",
        "total_amount": 114.52,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39801,
        "date": "2025-12-24",
        "total_amount": 4.72,
        "transaction_type": "expense",
        "merchant_group_id": 7601,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walgreens"
        }
      },
      {
        "id": 39529,
        "date": "2025-12-24",
        "total_amount": 40,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39955,
        "date": "2025-12-25",
        "total_amount": 31.25,
        "transaction_type": "expense",
        "merchant_group_id": 7297,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Power Homeschool"
        }
      },
      {
        "id": 39799,
        "date": "2025-12-25",
        "total_amount": 149,
        "transaction_type": "expense",
        "merchant_group_id": 7386,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Prisma Health Urgent"
        }
      },
      {
        "id": 39952,
        "date": "2025-12-26",
        "total_amount": 26.49,
        "transaction_type": "expense",
        "merchant_group_id": 7619,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Target Com Www Target Comn"
        }
      },
      {
        "id": 39912,
        "date": "2025-12-26",
        "total_amount": 60,
        "transaction_type": "income",
        "merchant_group_id": 7401,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Deposit Ref Number"
        }
      },
      {
        "id": 39913,
        "date": "2025-12-26",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39950,
        "date": "2025-12-26",
        "total_amount": 100.64,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39951,
        "date": "2025-12-26",
        "total_amount": 3.55,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39953,
        "date": "2025-12-26",
        "total_amount": 35.62,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 39954,
        "date": "2025-12-26",
        "total_amount": 96.16,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 39512,
        "date": "2025-12-26",
        "total_amount": 60,
        "transaction_type": "income",
        "merchant_group_id": 7418,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Item Check From Sheila Britton"
        }
      },
      {
        "id": 39967,
        "date": "2025-12-26",
        "total_amount": 7.41,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": undefined
      },
      {
        "id": 39511,
        "date": "2025-12-26",
        "total_amount": 4150.74,
        "transaction_type": "income",
        "merchant_group_id": 7419,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark Gr Payroll 1067"
        }
      },
      {
        "id": 39949,
        "date": "2025-12-28",
        "total_amount": 15.3,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 39948,
        "date": "2025-12-29",
        "total_amount": 2.37,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 39947,
        "date": "2025-12-29",
        "total_amount": 9.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 40012,
        "date": "2025-12-29",
        "total_amount": 32.73,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39914,
        "date": "2025-12-29",
        "total_amount": 21.25,
        "transaction_type": "income",
        "merchant_group_id": 7421,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Wadsworth I Ref Ib0w8ngv4"
        }
      },
      {
        "id": 39915,
        "date": "2025-12-29",
        "total_amount": 60,
        "transaction_type": "income",
        "merchant_group_id": 7526,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer From Wadsworth N Ref Ib0w8ngp6"
        }
      },
      {
        "id": 39945,
        "date": "2025-12-29",
        "total_amount": 83.34,
        "transaction_type": "expense",
        "merchant_group_id": 7548,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Greenville Water"
        }
      },
      {
        "id": 39946,
        "date": "2025-12-29",
        "total_amount": 2.08,
        "transaction_type": "expense",
        "merchant_group_id": 7613,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Autoagent Service Fee 877 932 8478 Me"
        }
      },
      {
        "id": 39943,
        "date": "2025-12-30",
        "total_amount": 72.08,
        "transaction_type": "expense",
        "merchant_group_id": 7411,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Ulta"
        }
      },
      {
        "id": 39918,
        "date": "2025-12-30",
        "total_amount": 6.4,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 39944,
        "date": "2025-12-30",
        "total_amount": 1097.09,
        "transaction_type": "expense",
        "merchant_group_id": 7610,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Wayfair"
        }
      },
      {
        "id": 39940,
        "date": "2025-12-30",
        "total_amount": 5.3,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39941,
        "date": "2025-12-30",
        "total_amount": 8.22,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39917,
        "date": "2025-12-30",
        "total_amount": 2.66,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39942,
        "date": "2025-12-30",
        "total_amount": 276.66,
        "transaction_type": "income",
        "merchant_group_id": 7500,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Lidl"
        }
      },
      {
        "id": 39929,
        "date": "2025-12-30",
        "total_amount": 6.4,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 39916,
        "date": "2025-12-30",
        "total_amount": 30,
        "transaction_type": "expense",
        "merchant_group_id": 7405,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Nebula Subscription Denver"
        }
      },
      {
        "id": 39923,
        "date": "2025-12-30",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39920,
        "date": "2025-12-31",
        "total_amount": 0.01,
        "transaction_type": "expense",
        "merchant_group_id": 7443,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Interest"
        }
      },
      {
        "id": 39936,
        "date": "2025-12-31",
        "total_amount": 11.2,
        "transaction_type": "expense",
        "merchant_group_id": 7450,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "GoodWill"
        }
      },
      {
        "id": 39937,
        "date": "2025-12-31",
        "total_amount": 45.75,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39938,
        "date": "2025-12-31",
        "total_amount": 9.62,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 39939,
        "date": "2025-12-31",
        "total_amount": 10.78,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 39922,
        "date": "2025-12-31",
        "total_amount": 9154.74,
        "transaction_type": "expense",
        "merchant_group_id": 7572,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Greenville Count Echeck Jonathan Wadsworth"
        }
      },
      {
        "id": 39921,
        "date": "2025-12-31",
        "total_amount": 1.5,
        "transaction_type": "expense",
        "merchant_group_id": 7602,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Autoagent Webpayment Wadsworth"
        }
      },
      {
        "id": 39927,
        "date": "2025-12-31",
        "total_amount": 28.57,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39928,
        "date": "2025-12-31",
        "total_amount": 14.21,
        "transaction_type": "expense",
        "merchant_group_id": 7296,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Protective Life Insurance"
        }
      },
      {
        "id": 39924,
        "date": "2026-01-01",
        "total_amount": 21.6,
        "transaction_type": "expense",
        "merchant_group_id": 7622,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Digital Ocean"
        }
      },
      {
        "id": 39961,
        "date": "2026-01-01",
        "total_amount": 72,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 39958,
        "date": "2026-01-02",
        "total_amount": 7.17,
        "transaction_type": "expense",
        "merchant_group_id": 7392,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Nintendo Ca1538459053 800 2553700 Wa"
        }
      },
      {
        "id": 39959,
        "date": "2026-01-02",
        "total_amount": 23.94,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 39960,
        "date": "2026-01-02",
        "total_amount": 3.23,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 40003,
        "date": "2026-01-02",
        "total_amount": 2000.14,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 40032,
        "date": "2026-01-02",
        "total_amount": 52.59,
        "transaction_type": "expense",
        "merchant_group_id": 7513,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Shein"
        }
      },
      {
        "id": 39957,
        "date": "2026-01-02",
        "total_amount": 154.99,
        "transaction_type": "expense",
        "merchant_group_id": 7623,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Bt Dive Shormann Mat936 372 6299 Tx"
        }
      },
      {
        "id": 39932,
        "date": "2026-01-02",
        "total_amount": 26.49,
        "transaction_type": "expense",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 39930,
        "date": "2026-01-02",
        "total_amount": 500,
        "transaction_type": "expense",
        "merchant_group_id": 7600,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Northhillschurch Northhills St L1j1m9l0a"
        }
      },
      {
        "id": 39925,
        "date": "2026-01-02",
        "total_amount": 75,
        "transaction_type": "income",
        "merchant_group_id": 7559,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer From Wadsworth J Ref Op0w9z"
        }
      },
      {
        "id": 39926,
        "date": "2026-01-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7564,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Wadsworth J Ref Op0w9zq7"
        }
      },
      {
        "id": 39935,
        "date": "2026-01-02",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 39933,
        "date": "2026-01-02",
        "total_amount": 600.76,
        "transaction_type": "expense",
        "merchant_group_id": 7575,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth"
        }
      },
      {
        "id": 39931,
        "date": "2026-01-03",
        "total_amount": 9,
        "transaction_type": "expense",
        "merchant_group_id": 7539,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Runcloud Sdn Bhd Cyberjaya Se"
        }
      },
      {
        "id": 39956,
        "date": "2026-01-03",
        "total_amount": 6.83,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39998,
        "date": "2026-01-04",
        "total_amount": 10.78,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 39999,
        "date": "2026-01-04",
        "total_amount": 120.75,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 39997,
        "date": "2026-01-04",
        "total_amount": 37.62,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 39934,
        "date": "2026-01-05",
        "total_amount": 450,
        "transaction_type": "income",
        "merchant_group_id": 7606,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Edeposit In Branch Store"
        }
      },
      {
        "id": 39962,
        "date": "2026-01-05",
        "total_amount": 2924.77,
        "transaction_type": "expense",
        "merchant_group_id": 7302,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Provident Funding"
        }
      },
      {
        "id": 39963,
        "date": "2026-01-05",
        "total_amount": 215,
        "transaction_type": "expense",
        "merchant_group_id": 7322,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Scota Karate"
        }
      },
      {
        "id": 39964,
        "date": "2026-01-05",
        "total_amount": 126.8,
        "transaction_type": "expense",
        "merchant_group_id": 7399,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Transfer Ref Ib0rlwbvjk To Signify Business Essent..."
        }
      },
      {
        "id": 39965,
        "date": "2026-01-05",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 39966,
        "date": "2026-01-05",
        "total_amount": 126.8,
        "transaction_type": "income",
        "merchant_group_id": 7531,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Pymt From Checking Xxxxxx4464"
        }
      },
      {
        "id": 39972,
        "date": "2026-01-05",
        "total_amount": 450,
        "transaction_type": "income",
        "merchant_group_id": 7567,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Edeposit In Branch 01 25 24 03 43 57 Pm 2616 Wade..."
        }
      },
      {
        "id": 39973,
        "date": "2026-01-05",
        "total_amount": 500,
        "transaction_type": "income",
        "merchant_group_id": 7567,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Edeposit In Branch 01 25 24 03 43 57 Pm 2616 Wade..."
        }
      },
      {
        "id": 39974,
        "date": "2026-01-05",
        "total_amount": 126.8,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39994,
        "date": "2026-01-05",
        "total_amount": 49.17,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39995,
        "date": "2026-01-05",
        "total_amount": 4.45,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 39996,
        "date": "2026-01-05",
        "total_amount": 43,
        "transaction_type": "expense",
        "merchant_group_id": 7325,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Compassion International"
        }
      },
      {
        "id": 39971,
        "date": "2026-01-06",
        "total_amount": 800,
        "transaction_type": "expense",
        "merchant_group_id": 7446,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "American Tree Land"
        }
      },
      {
        "id": 39993,
        "date": "2026-01-06",
        "total_amount": 6.48,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 39992,
        "date": "2026-01-06",
        "total_amount": 2.37,
        "transaction_type": "expense",
        "merchant_group_id": 7359,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Wendys"
        }
      },
      {
        "id": 39991,
        "date": "2026-01-06",
        "total_amount": 9.17,
        "transaction_type": "expense",
        "merchant_group_id": 7361,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Zaxbys"
        }
      },
      {
        "id": 40011,
        "date": "2026-01-06",
        "total_amount": 10.46,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": undefined
      },
      {
        "id": 39970,
        "date": "2026-01-06",
        "total_amount": 125,
        "transaction_type": "expense",
        "merchant_group_id": 7328,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Citi Card Payments"
        }
      },
      {
        "id": 39988,
        "date": "2026-01-07",
        "total_amount": 3.46,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 39980,
        "date": "2026-01-07",
        "total_amount": 811.39,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39976,
        "date": "2026-01-07",
        "total_amount": 5556.18,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 201,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 39989,
        "date": "2026-01-07",
        "total_amount": 4.74,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 39990,
        "date": "2026-01-07",
        "total_amount": 65.24,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 39968,
        "date": "2026-01-08",
        "total_amount": 5556.18,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39969,
        "date": "2026-01-08",
        "total_amount": 3707.77,
        "transaction_type": "income",
        "merchant_group_id": 7419,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark Gr Payroll 1067"
        }
      },
      {
        "id": 39986,
        "date": "2026-01-08",
        "total_amount": 0.43,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 40005,
        "date": "2026-01-08",
        "total_amount": 32.81,
        "transaction_type": "expense",
        "merchant_group_id": null,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": undefined
      },
      {
        "id": 39975,
        "date": "2026-01-08",
        "total_amount": 811.39,
        "transaction_type": "expense",
        "merchant_group_id": 7442,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Chase Card Epay"
        }
      },
      {
        "id": 39987,
        "date": "2026-01-08",
        "total_amount": 26.63,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40031,
        "date": "2026-01-08",
        "total_amount": 433.38,
        "transaction_type": "expense",
        "merchant_group_id": 7301,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Optavia"
        }
      },
      {
        "id": 39984,
        "date": "2026-01-09",
        "total_amount": 45.17,
        "transaction_type": "expense",
        "merchant_group_id": 7451,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Moes"
        }
      },
      {
        "id": 39985,
        "date": "2026-01-09",
        "total_amount": 3.5,
        "transaction_type": "expense",
        "merchant_group_id": 7329,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Dollar Tree"
        }
      },
      {
        "id": 39981,
        "date": "2026-01-09",
        "total_amount": 3707.77,
        "transaction_type": "income",
        "merchant_group_id": 7419,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark Gr Payroll 1067"
        }
      },
      {
        "id": 40006,
        "date": "2026-01-09",
        "total_amount": 1248.72,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 39983,
        "date": "2026-01-10",
        "total_amount": 35.02,
        "transaction_type": "expense",
        "merchant_group_id": 7441,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Texas Roadhouse"
        }
      },
      {
        "id": 39982,
        "date": "2026-01-11",
        "total_amount": 276.13,
        "transaction_type": "expense",
        "merchant_group_id": 7515,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Pay Greer Cpw"
        }
      },
      {
        "id": 40029,
        "date": "2026-01-11",
        "total_amount": 87.1,
        "transaction_type": "expense",
        "merchant_group_id": 7621,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi 76093 Greer Sc"
        }
      },
      {
        "id": 40028,
        "date": "2026-01-12",
        "total_amount": 8.39,
        "transaction_type": "expense",
        "merchant_group_id": 7293,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Taco Bell"
        }
      },
      {
        "id": 40002,
        "date": "2026-01-12",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 40027,
        "date": "2026-01-13",
        "total_amount": 69.65,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40004,
        "date": "2026-01-13",
        "total_amount": 1303.68,
        "transaction_type": "income",
        "merchant_group_id": null,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": undefined
      },
      {
        "id": 40025,
        "date": "2026-01-14",
        "total_amount": 7.77,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 40000,
        "date": "2026-01-14",
        "total_amount": 224.66,
        "transaction_type": "expense",
        "merchant_group_id": 7327,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Duke Energy"
        }
      },
      {
        "id": 40026,
        "date": "2026-01-14",
        "total_amount": 10.78,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 40001,
        "date": "2026-01-14",
        "total_amount": 129.05,
        "transaction_type": "income",
        "merchant_group_id": 7607,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Poshmark Poshmark Xxxxx8"
        }
      },
      {
        "id": 40024,
        "date": "2026-01-14",
        "total_amount": 48.38,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 40021,
        "date": "2026-01-15",
        "total_amount": 12.19,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40015,
        "date": "2026-01-15",
        "total_amount": 128,
        "transaction_type": "expense",
        "merchant_group_id": 7548,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Greenville Water"
        }
      },
      {
        "id": 40016,
        "date": "2026-01-15",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 40020,
        "date": "2026-01-15",
        "total_amount": 4295.58,
        "transaction_type": "income",
        "merchant_group_id": 7453,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Credit Card Payment"
        }
      },
      {
        "id": 40022,
        "date": "2026-01-15",
        "total_amount": 24.66,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40023,
        "date": "2026-01-15",
        "total_amount": 5.28,
        "transaction_type": "expense",
        "merchant_group_id": 7347,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Tropical Grille"
        }
      },
      {
        "id": 40017,
        "date": "2026-01-16",
        "total_amount": 2.16,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 40018,
        "date": "2026-01-16",
        "total_amount": 8.48,
        "transaction_type": "expense",
        "merchant_group_id": 7620,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Sq Chestnut Coffee Housegreenville Sc"
        }
      },
      {
        "id": 40019,
        "date": "2026-01-16",
        "total_amount": 7.37,
        "transaction_type": "expense",
        "merchant_group_id": 7624,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Ab Abebooks Lb9l29 Abebooks Com Wa"
        }
      },
      {
        "id": 40014,
        "date": "2026-01-16",
        "total_amount": 26.49,
        "transaction_type": "income",
        "merchant_group_id": 7366,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Costco"
        }
      },
      {
        "id": 40058,
        "date": "2026-01-17",
        "total_amount": 5,
        "transaction_type": "expense",
        "merchant_group_id": 7578,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Girl Scouts Of The United855 530 4467 Ny"
        }
      },
      {
        "id": 40013,
        "date": "2026-01-17",
        "total_amount": 75,
        "transaction_type": "expense",
        "merchant_group_id": 7551,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Tmobile Auto Pay Bellevue Wa"
        }
      },
      {
        "id": 40059,
        "date": "2026-01-17",
        "total_amount": 10.59,
        "transaction_type": "expense",
        "merchant_group_id": 7577,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Barnes Noble 2558 Greenville Sc"
        }
      },
      {
        "id": 40057,
        "date": "2026-01-17",
        "total_amount": 4.32,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 40060,
        "date": "2026-01-17",
        "total_amount": 14.67,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 40055,
        "date": "2026-01-18",
        "total_amount": 40.94,
        "transaction_type": "expense",
        "merchant_group_id": 7356,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "QT"
        }
      },
      {
        "id": 40056,
        "date": "2026-01-18",
        "total_amount": 69.07,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40054,
        "date": "2026-01-19",
        "total_amount": 53.66,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 40052,
        "date": "2026-01-19",
        "total_amount": 10.51,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40035,
        "date": "2026-01-19",
        "total_amount": 10.46,
        "transaction_type": "expense",
        "merchant_group_id": 7615,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Cloudflare"
        }
      },
      {
        "id": 40053,
        "date": "2026-01-19",
        "total_amount": 9.28,
        "transaction_type": "expense",
        "merchant_group_id": 7352,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Burger King"
        }
      },
      {
        "id": 40034,
        "date": "2026-01-20",
        "total_amount": 4295.58,
        "transaction_type": "expense",
        "merchant_group_id": 7349,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Robinhood Card Main Checking"
        }
      },
      {
        "id": 40033,
        "date": "2026-01-20",
        "total_amount": 1406.09,
        "transaction_type": "income",
        "merchant_group_id": 7425,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Homeaway Com In Payout Ede8e2afb6db407 Trn 1 Ede8e..."
        }
      },
      {
        "id": 40051,
        "date": "2026-01-20",
        "total_amount": 18.33,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 40066,
        "date": "2026-01-20",
        "total_amount": 14.83,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 40047,
        "date": "2026-01-21",
        "total_amount": 15.47,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 40048,
        "date": "2026-01-21",
        "total_amount": 69.9,
        "transaction_type": "expense",
        "merchant_group_id": 7502,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Lowes"
        }
      },
      {
        "id": 40049,
        "date": "2026-01-21",
        "total_amount": 21.66,
        "transaction_type": "expense",
        "merchant_group_id": 7364,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Publix"
        }
      },
      {
        "id": 40050,
        "date": "2026-01-21",
        "total_amount": 30.53,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40065,
        "date": "2026-01-21",
        "total_amount": 74.99,
        "transaction_type": "expense",
        "merchant_group_id": 7468,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Spectrum"
        }
      },
      {
        "id": 40071,
        "date": "2026-01-21",
        "total_amount": 225,
        "transaction_type": "expense",
        "merchant_group_id": 7298,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Paypal"
        }
      },
      {
        "id": 40046,
        "date": "2026-01-21",
        "total_amount": 7.77,
        "transaction_type": "expense",
        "merchant_group_id": 7353,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Chick Fil A"
        }
      },
      {
        "id": 40068,
        "date": "2026-01-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 40074,
        "date": "2026-01-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 40044,
        "date": "2026-01-22",
        "total_amount": 126.12,
        "transaction_type": "expense",
        "merchant_group_id": 7582,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Amazon Mktpl Tu7w169m3 Amzn Com Billwa"
        }
      },
      {
        "id": 40075,
        "date": "2026-01-22",
        "total_amount": 25,
        "transaction_type": "income",
        "merchant_group_id": 7372,
        "account_id": 256,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 40045,
        "date": "2026-01-22",
        "total_amount": 282.89,
        "transaction_type": "expense",
        "merchant_group_id": 7365,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Autozone"
        }
      },
      {
        "id": 40070,
        "date": "2026-01-22",
        "total_amount": 37.11,
        "transaction_type": "expense",
        "merchant_group_id": 7565,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Dukeenergycorpor Web Pay Jan 26"
        }
      },
      {
        "id": 40069,
        "date": "2026-01-22",
        "total_amount": 25,
        "transaction_type": "expense",
        "merchant_group_id": 7372,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Recurring Transfer To Jonathan R Wadsworth Busines..."
        }
      },
      {
        "id": 40043,
        "date": "2026-01-23",
        "total_amount": 14.83,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40041,
        "date": "2026-01-23",
        "total_amount": 4.64,
        "transaction_type": "expense",
        "merchant_group_id": 7355,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Mcdonalds"
        }
      },
      {
        "id": 40073,
        "date": "2026-01-23",
        "total_amount": 3707.77,
        "transaction_type": "income",
        "merchant_group_id": 7419,
        "account_id": 258,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Sttark Gr Payroll 1067"
        }
      },
      {
        "id": 40067,
        "date": "2026-01-23",
        "total_amount": 825,
        "transaction_type": "income",
        "merchant_group_id": 7570,
        "account_id": 261,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Rentals A1l2e000 Sigonfile 5qxyt3 Jonathan Wadswor..."
        }
      },
      {
        "id": 40072,
        "date": "2026-01-23",
        "total_amount": 1200,
        "transaction_type": "income",
        "merchant_group_id": 7373,
        "account_id": 262,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "The Brand Leader The Brand Leader Paying Bill Via..."
        }
      },
      {
        "id": 40042,
        "date": "2026-01-23",
        "total_amount": 29.29,
        "transaction_type": "expense",
        "merchant_group_id": 7346,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Aldi Supermarket"
        }
      },
      {
        "id": 40040,
        "date": "2026-01-24",
        "total_amount": 6.13,
        "transaction_type": "expense",
        "merchant_group_id": 7351,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Arbys"
        }
      },
      {
        "id": 40036,
        "date": "2026-01-24",
        "total_amount": 14.15,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40037,
        "date": "2026-01-24",
        "total_amount": 15.1,
        "transaction_type": "expense",
        "merchant_group_id": 7311,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Little Caesars"
        }
      },
      {
        "id": 40038,
        "date": "2026-01-24",
        "total_amount": 26.61,
        "transaction_type": "expense",
        "merchant_group_id": 7452,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "76 Petroleum"
        }
      },
      {
        "id": 40039,
        "date": "2026-01-24",
        "total_amount": 38.55,
        "transaction_type": "expense",
        "merchant_group_id": 7358,
        "account_id": null,
        "credit_card_id": 204,
        "merchant_groups": {
          "display_name": "Walmart"
        }
      },
      {
        "id": 40062,
        "date": "2026-01-25",
        "total_amount": 10.6,
        "transaction_type": "expense",
        "merchant_group_id": 7427,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Openai San Franciscoca"
        }
      },
      {
        "id": 40064,
        "date": "2026-01-27",
        "total_amount": 25.63,
        "transaction_type": "expense",
        "merchant_group_id": 7350,
        "account_id": null,
        "credit_card_id": 203,
        "merchant_groups": {
          "display_name": "Amazon"
        }
      },
      {
        "id": 40061,
        "date": "2026-01-28",
        "total_amount": 14.31,
        "transaction_type": "expense",
        "merchant_group_id": 7533,
        "account_id": null,
        "credit_card_id": 202,
        "merchant_groups": {
          "display_name": "Ab Abebooks Lcykkh Seattle Wa"
        }
      },
      {
        "id": 40063,
        "date": "2026-01-28",
        "total_amount": 92,
        "transaction_type": "income",
        "merchant_group_id": 7560,
        "account_id": 255,
        "credit_card_id": null,
        "merchant_groups": {
          "display_name": "Poshmark Poshmark Xxxxx3951 Heather W"
        }
      }
    ],
    "analysis": [
      {
        "merchantGroupId": 7298,
        "merchantName": "Paypal",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "low",
        "reason": "Very frequent but highly irregular income transactions with large amount variance. Not a fixed subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7358,
        "merchantName": "Walmart",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a retail store, not a subscription. High variance in interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7372,
        "merchantName": "Recurring Transfer To Jonathan R Wadsworth Busines...",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Internal transfers are excluded from detection.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7366,
        "merchantName": "Costco",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a retail store, not a subscription. High variance in interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7453,
        "merchantName": "Credit Card Payment",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Credit card payments with no clear recurring frequency or amount.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7353,
        "merchantName": "Chick Fil A",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a fast-food restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7438,
        "merchantName": "Wealthfront Deposits",
        "isRecurring": true,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Although this was a recurring deposit, it is INACTIVE. The last transaction was 114 days ago, which is far greater than 1.5x the average interval of 10.6 days.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7356,
        "merchantName": "QT",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a gas station/convenience store, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7294,
        "merchantName": "Sttark",
        "isRecurring": true,
        "frequency": "biweekly",
        "confidence": "high",
        "reason": "This was a clear biweekly income pattern, but it is INACTIVE. The last transaction was 51 days ago, far exceeding the 21-day threshold for a biweekly pattern.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7296,
        "merchantName": "Protective Life Insurance",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Meaningful insurance bill with a consistent monthly pattern. The last transaction was 32 days ago, which is within the active threshold for a monthly recurrence.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7442,
        "merchantName": "Chase Card Epay",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Credit card payments with no clear recurring frequency or amount.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7355,
        "merchantName": "Mcdonalds",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a fast-food restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7350,
        "merchantName": "Amazon",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a retail store, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7346,
        "merchantName": "Aldi Supermarket",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a grocery store, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7328,
        "merchantName": "Citi Card Payments",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Credit card payments with no clear recurring frequency or amount.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7443,
        "merchantName": "Interest",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Interest accruals are explicitly excluded from detection.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7329,
        "merchantName": "Dollar Tree",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a retail store, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7361,
        "merchantName": "Zaxbys",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a fast-food restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7468,
        "merchantName": "Spectrum",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Meaningful utility bill with a strong monthly signal. The last transaction was 11 days ago, making it currently active.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7327,
        "merchantName": "Duke Energy",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Meaningful utility bill with a very consistent monthly interval. The last transaction was 18 days ago, making it currently active.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7322,
        "merchantName": "Scota Karate",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Likely a membership fee with a very consistent monthly pattern. The last transaction was 27 days ago, making it currently active.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7302,
        "merchantName": "Provident Funding",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Likely a mortgage or loan payment with a strong monthly pattern. The last transaction was 27 days ago, making it currently active.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7515,
        "merchantName": "Pay Greer Cpw",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Meaningful utility bill with a very consistent monthly interval. The last transaction was 21 days ago, making it currently active.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7575,
        "merchantName": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Clear mortgage payment with a very strong monthly pattern. The last transaction was 30 days ago, making it currently active.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7535,
        "merchantName": "Transfer From Jonathan R Wadsworth Business Market...",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Internal transfers are excluded. Also, the pattern is INACTIVE, with the last transaction 433 days ago.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7311,
        "merchantName": "Little Caesars",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a fast-food restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7440,
        "merchantName": "Venmo Jonathan Wadsworth",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "medium",
        "reason": "Irregular P2P payments. The pattern is also INACTIVE, with the last transaction 90 days ago, exceeding 1.5x the average interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7359,
        "merchantName": "Wendys",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a fast-food restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7456,
        "merchantName": "Google",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "This was a likely monthly subscription, but it is INACTIVE. The last transaction was 184 days ago, far exceeding the threshold for a monthly pattern.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7351,
        "merchantName": "Arbys",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a fast-food restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7539,
        "merchantName": "Runcloud Sdn Bhd Cyberjaya Se",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "high",
        "reason": "Likely a SaaS subscription with a strong monthly signal. The last transaction was 29 days ago, making it currently active.",
        "shouldDetect": true
      },
      {
        "merchantGroupId": 7352,
        "merchantName": "Burger King",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a fast-food restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7450,
        "merchantName": "GoodWill",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a retail store, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7401,
        "merchantName": "Deposit Ref Number",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular deposits with no clear pattern in frequency or amount.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7481,
        "merchantName": "Home Depot",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular retail purchases. The pattern is also INACTIVE, with the last transaction 125 days ago.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7347,
        "merchantName": "Tropical Grille",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7502,
        "merchantName": "Lowes",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a retail store, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7320,
        "merchantName": "Northhillschurch.com",
        "isRecurring": true,
        "frequency": "monthly",
        "confidence": "medium",
        "reason": "This appeared to be a monthly donation, but it is INACTIVE. The last transaction was 69 days ago, exceeding the 46-day threshold for a monthly pattern.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7441,
        "merchantName": "Texas Roadhouse",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a restaurant, not a subscription.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7314,
        "merchantName": "Jack In The Box",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular fast-food purchases. The pattern is also INACTIVE, with the last transaction 47 days ago against a 13-day average interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7449,
        "merchantName": "Lowes Credit Card",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "medium",
        "reason": "Irregular credit card payments. The pattern is also INACTIVE, with the last transaction 115 days ago against a 60-day average interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7446,
        "merchantName": "American Tree Land",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular, high-value purchases with no consistent frequency.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7349,
        "merchantName": "Robinhood Card Main Checking",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular payments/transfers with no consistent frequency or amount.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7307,
        "merchantName": "Allstate",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "low",
        "reason": "While for an insurance company, the transaction intervals and amounts are too varied to establish a reliable recurring pattern.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7321,
        "merchantName": "Smoothie King",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases. The pattern is also INACTIVE, with the last transaction 99 days ago against a 16-day average interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7424,
        "merchantName": "Transfer To Wadsworth J Complete Advantage Rm Xxxx...",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Internal transfers are excluded. Also, the pattern is extremely INACTIVE, with the last transaction 639 days ago.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7313,
        "merchantName": "Harris Teeter",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular grocery purchases. The pattern is also INACTIVE, with the last transaction 87 days ago against an 18-day average interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7300,
        "merchantName": "Groundfloor",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "medium",
        "reason": "Irregular income. The pattern is also INACTIVE, with the last transaction 200 days ago against a 72-day average interval.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7398,
        "merchantName": "Transfer To Wadsworth J Everyday Checking Xxxxxx44...",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Internal transfers are excluded. Also, the pattern is INACTIVE, with the last transaction 223 days ago.",
        "shouldDetect": false
      },
      {
        "merchantGroupId": 7345,
        "merchantName": "Ross Dress For Less",
        "isRecurring": false,
        "frequency": "irregular",
        "confidence": "high",
        "reason": "Irregular purchases at a retail store, not a subscription.",
        "shouldDetect": false
      }
    ],
    "merchantSummaries": [
      {
        "merchantGroupId": 7298,
        "merchantName": "Paypal",
        "transactionCount": 172,
        "firstDate": "2023-12-08",
        "lastDate": "2026-01-21",
        "daysSinceLastTransaction": 11,
        "dateSpanDays": 775,
        "avgInterval": 4.5321637426900585,
        "minInterval": 0,
        "maxInterval": 16,
        "minAmount": 7,
        "maxAmount": 3546,
        "avgAmount": 298.92226744186047,
        "amountVariance": 144078.38562916106,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-08",
          "2023-12-11",
          "2023-12-14",
          "2023-12-15",
          "2023-12-19",
          "2023-12-28",
          "2024-01-02",
          "2024-01-02",
          "2024-01-05",
          "2024-01-08"
        ],
        "sampleAmounts": [
          1986.95,
          225,
          225,
          250,
          681.81,
          1773,
          225,
          50,
          2104.12,
          225
        ]
      },
      {
        "merchantGroupId": 7358,
        "merchantName": "Walmart",
        "transactionCount": 172,
        "firstDate": "2024-06-07",
        "lastDate": "2026-01-24",
        "daysSinceLastTransaction": 8,
        "dateSpanDays": 596,
        "avgInterval": 3.4853801169590644,
        "minInterval": 0,
        "maxInterval": 67,
        "minAmount": 1.56,
        "maxAmount": 972.02,
        "avgAmount": 46.3850581395349,
        "amountVariance": 7098.276847089644,
        "transactionType": "income",
        "sampleDates": [
          "2024-06-07",
          "2024-06-15",
          "2024-08-21",
          "2024-10-05",
          "2024-11-22",
          "2024-11-22",
          "2024-11-24",
          "2024-11-27",
          "2024-11-29",
          "2024-11-29"
        ],
        "sampleAmounts": [
          37.82,
          972.02,
          4.18,
          31.26,
          41.64,
          14.78,
          21.67,
          78.44,
          29.68,
          23.32
        ]
      },
      {
        "merchantGroupId": 7372,
        "merchantName": "Recurring Transfer To Jonathan R Wadsworth Busines...",
        "transactionCount": 125,
        "firstDate": "2023-12-22",
        "lastDate": "2026-01-22",
        "daysSinceLastTransaction": 10,
        "dateSpanDays": 762,
        "avgInterval": 6.145161290322581,
        "minInterval": 0,
        "maxInterval": 33,
        "minAmount": 25,
        "maxAmount": 865.74,
        "avgAmount": 173.37024000000005,
        "amountVariance": 102410.77145994255,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-22",
          "2023-12-22",
          "2023-12-22",
          "2023-12-22",
          "2024-01-02",
          "2024-01-02",
          "2024-01-22",
          "2024-01-22",
          "2024-01-22",
          "2024-01-22"
        ],
        "sampleAmounts": [
          25,
          25,
          25,
          25,
          865.74,
          865.74,
          25,
          25,
          25,
          25
        ]
      },
      {
        "merchantGroupId": 7366,
        "merchantName": "Costco",
        "transactionCount": 103,
        "firstDate": "2023-12-20",
        "lastDate": "2026-01-16",
        "daysSinceLastTransaction": 16,
        "dateSpanDays": 758,
        "avgInterval": 7.431372549019608,
        "minInterval": 0,
        "maxInterval": 73,
        "minAmount": 2.15,
        "maxAmount": 249.08,
        "avgAmount": 54.54912621359223,
        "amountVariance": 2960.656573022906,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-20",
          "2023-12-20",
          "2023-12-20",
          "2023-12-30",
          "2023-12-30",
          "2023-12-30",
          "2024-01-18",
          "2024-01-30",
          "2024-02-17",
          "2024-04-17"
        ],
        "sampleAmounts": [
          44.64,
          5.27,
          12.4,
          17.49,
          3.23,
          10.35,
          96.02,
          48.4,
          120.66,
          54.7
        ]
      },
      {
        "merchantGroupId": 7453,
        "merchantName": "Credit Card Payment",
        "transactionCount": 78,
        "firstDate": "2024-01-03",
        "lastDate": "2026-01-15",
        "daysSinceLastTransaction": 17,
        "dateSpanDays": 743,
        "avgInterval": 9.64935064935065,
        "minInterval": 0,
        "maxInterval": 33,
        "minAmount": 9.77,
        "maxAmount": 10314.99,
        "avgAmount": 1332.016153846154,
        "amountVariance": 4319157.560633925,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-03",
          "2024-01-08",
          "2024-02-07",
          "2024-02-07",
          "2024-03-07",
          "2024-04-04",
          "2024-04-09",
          "2024-04-10",
          "2024-04-30",
          "2024-05-19"
        ],
        "sampleAmounts": [
          151.6,
          71.53,
          137.86,
          507.63,
          487.61,
          95.38,
          9.77,
          457.58,
          285.86,
          601.24
        ]
      },
      {
        "merchantGroupId": 7353,
        "merchantName": "Chick Fil A",
        "transactionCount": 67,
        "firstDate": "2024-11-20",
        "lastDate": "2026-01-21",
        "daysSinceLastTransaction": 11,
        "dateSpanDays": 427,
        "avgInterval": 6.46969696969697,
        "minInterval": 0,
        "maxInterval": 108,
        "minAmount": 0.43,
        "maxAmount": 43.84,
        "avgAmount": 9.640447761194029,
        "amountVariance": 75.62690278458452,
        "transactionType": "income",
        "sampleDates": [
          "2024-11-20",
          "2024-11-21",
          "2024-12-10",
          "2025-01-21",
          "2025-01-22",
          "2025-01-25",
          "2025-05-13",
          "2025-05-21",
          "2025-05-23",
          "2025-05-30"
        ],
        "sampleAmounts": [
          25.68,
          9.64,
          16.8,
          10.16,
          19.57,
          22.23,
          21.58,
          5.28,
          27.95,
          4.96
        ]
      },
      {
        "merchantGroupId": 7438,
        "merchantName": "Wealthfront Deposits",
        "transactionCount": 62,
        "firstDate": "2024-01-03",
        "lastDate": "2025-10-10",
        "daysSinceLastTransaction": 114,
        "dateSpanDays": 646,
        "avgInterval": 10.59016393442623,
        "minInterval": 0,
        "maxInterval": 55,
        "minAmount": 50,
        "maxAmount": 29000,
        "avgAmount": 1018.111129032258,
        "amountVariance": 16032848.942764854,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-03",
          "2024-01-03",
          "2024-01-03",
          "2024-01-09",
          "2024-02-02",
          "2024-02-02",
          "2024-02-02",
          "2024-03-04",
          "2024-03-04",
          "2024-03-04"
        ],
        "sampleAmounts": [
          100,
          250,
          400,
          1932,
          100,
          250,
          400,
          100,
          250,
          400
        ]
      },
      {
        "merchantGroupId": 7356,
        "merchantName": "QT",
        "transactionCount": 59,
        "firstDate": "2024-11-22",
        "lastDate": "2026-01-18",
        "daysSinceLastTransaction": 14,
        "dateSpanDays": 422,
        "avgInterval": 7.275862068965517,
        "minInterval": 0,
        "maxInterval": 83,
        "minAmount": 0.89,
        "maxAmount": 48.73,
        "avgAmount": 19.410847457627117,
        "amountVariance": 310.1876348750359,
        "transactionType": "income",
        "sampleDates": [
          "2024-11-22",
          "2024-11-27",
          "2024-12-07",
          "2025-02-28",
          "2025-05-21",
          "2025-05-22",
          "2025-05-28",
          "2025-05-30",
          "2025-06-04",
          "2025-06-07"
        ],
        "sampleAmounts": [
          2.15,
          12.24,
          1.93,
          19.63,
          17.61,
          43.07,
          46.17,
          1.78,
          41,
          8.66
        ]
      },
      {
        "merchantGroupId": 7294,
        "merchantName": "Sttark",
        "transactionCount": 54,
        "firstDate": "2023-12-15",
        "lastDate": "2025-12-12",
        "daysSinceLastTransaction": 51,
        "dateSpanDays": 728,
        "avgInterval": 13.735849056603774,
        "minInterval": 0,
        "maxInterval": 14,
        "minAmount": 3614.15,
        "maxAmount": 4734.36,
        "avgAmount": 4035.895555555552,
        "amountVariance": 23957.903895061725,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-15",
          "2023-12-29",
          "2024-01-12",
          "2024-01-26",
          "2024-02-09",
          "2024-02-23",
          "2024-03-08",
          "2024-03-22",
          "2024-04-05",
          "2024-04-19"
        ],
        "sampleAmounts": [
          3614.15,
          3862.26,
          3879.79,
          3879.79,
          3940.32,
          3879.79,
          4051.51,
          4051.51,
          4051.51,
          4051.51
        ]
      },
      {
        "merchantGroupId": 7296,
        "merchantName": "Protective Life Insurance",
        "transactionCount": 50,
        "firstDate": "2024-01-02",
        "lastDate": "2025-12-31",
        "daysSinceLastTransaction": 32,
        "dateSpanDays": 729,
        "avgInterval": 14.877551020408163,
        "minInterval": 0,
        "maxInterval": 34,
        "minAmount": 14.21,
        "maxAmount": 28.57,
        "avgAmount": 21.39000000000002,
        "amountVariance": 51.55239999999997,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-02",
          "2024-01-02",
          "2024-01-31",
          "2024-01-31",
          "2024-03-01",
          "2024-03-01",
          "2024-04-01",
          "2024-04-01",
          "2024-05-01",
          "2024-05-01"
        ],
        "sampleAmounts": [
          14.21,
          28.57,
          14.21,
          28.57,
          14.21,
          28.57,
          14.21,
          28.57,
          14.21,
          28.57
        ]
      },
      {
        "merchantGroupId": 7442,
        "merchantName": "Chase Card Epay",
        "transactionCount": 47,
        "firstDate": "2023-12-18",
        "lastDate": "2026-01-08",
        "daysSinceLastTransaction": 24,
        "dateSpanDays": 752,
        "avgInterval": 16.347826086956523,
        "minInterval": 0,
        "maxInterval": 42,
        "minAmount": 10.69,
        "maxAmount": 10314.99,
        "avgAmount": 1325.2517021276599,
        "amountVariance": 4975664.461018379,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-18",
          "2023-12-18",
          "2024-01-04",
          "2024-01-09",
          "2024-02-08",
          "2024-02-08",
          "2024-03-08",
          "2024-04-05",
          "2024-04-11",
          "2024-05-20"
        ],
        "sampleAmounts": [
          901.88,
          2220.1,
          151.6,
          71.53,
          507.63,
          137.86,
          487.61,
          95.38,
          457.58,
          473.59
        ]
      },
      {
        "merchantGroupId": 7355,
        "merchantName": "Mcdonalds",
        "transactionCount": 47,
        "firstDate": "2025-01-26",
        "lastDate": "2026-01-23",
        "daysSinceLastTransaction": 9,
        "dateSpanDays": 362,
        "avgInterval": 7.869565217391305,
        "minInterval": 0,
        "maxInterval": 96,
        "minAmount": 1.5,
        "maxAmount": 25.26,
        "avgAmount": 7.182978723404253,
        "amountVariance": 31.02045921231327,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-26",
          "2025-01-27",
          "2025-01-31",
          "2025-02-05",
          "2025-05-12",
          "2025-05-24",
          "2025-05-26",
          "2025-05-28",
          "2025-05-31",
          "2025-05-31"
        ],
        "sampleAmounts": [
          17.8,
          6.89,
          8.69,
          4.3,
          23.74,
          2.16,
          4.31,
          4.74,
          5.27,
          3
        ]
      },
      {
        "merchantGroupId": 7350,
        "merchantName": "Amazon",
        "transactionCount": 43,
        "firstDate": "2024-04-03",
        "lastDate": "2026-01-27",
        "daysSinceLastTransaction": 5,
        "dateSpanDays": 664,
        "avgInterval": 15.80952380952381,
        "minInterval": 0,
        "maxInterval": 137,
        "minAmount": 5.4,
        "maxAmount": 248.4,
        "avgAmount": 65.85139534883723,
        "amountVariance": 3190.364714332072,
        "transactionType": "income",
        "sampleDates": [
          "2024-04-03",
          "2024-05-15",
          "2024-06-09",
          "2024-06-15",
          "2024-07-20",
          "2024-07-25",
          "2024-08-09",
          "2024-08-11",
          "2024-09-05",
          "2024-09-19"
        ],
        "sampleAmounts": [
          18.19,
          39.08,
          28.77,
          92.22,
          50.61,
          21.19,
          42.36,
          68.4,
          8.47,
          76.28
        ]
      },
      {
        "merchantGroupId": 7346,
        "merchantName": "Aldi Supermarket",
        "transactionCount": 41,
        "firstDate": "2024-09-10",
        "lastDate": "2026-01-23",
        "daysSinceLastTransaction": 9,
        "dateSpanDays": 500,
        "avgInterval": 12.5,
        "minInterval": 0,
        "maxInterval": 169,
        "minAmount": 0.59,
        "maxAmount": 130.46,
        "avgAmount": 41.93731707317074,
        "amountVariance": 1486.535751338489,
        "transactionType": "income",
        "sampleDates": [
          "2024-09-10",
          "2025-02-26",
          "2025-05-05",
          "2025-05-07",
          "2025-05-10",
          "2025-05-16",
          "2025-05-28",
          "2025-05-31",
          "2025-06-03",
          "2025-06-23"
        ],
        "sampleAmounts": [
          13.49,
          14.8,
          9.88,
          5.27,
          6.06,
          24.33,
          26.7,
          5.19,
          93.43,
          106.03
        ]
      },
      {
        "merchantGroupId": 7328,
        "merchantName": "Citi Card Payments",
        "transactionCount": 40,
        "firstDate": "2023-12-18",
        "lastDate": "2026-01-06",
        "daysSinceLastTransaction": 26,
        "dateSpanDays": 750,
        "avgInterval": 19.23076923076923,
        "minInterval": 0,
        "maxInterval": 45,
        "minAmount": 57.83,
        "maxAmount": 13883.01,
        "avgAmount": 2369.4337500000006,
        "amountVariance": 9517073.761563437,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-18",
          "2024-01-04",
          "2024-01-09",
          "2024-02-08",
          "2024-03-07",
          "2024-04-05",
          "2024-05-03",
          "2024-05-20",
          "2024-06-07",
          "2024-07-15"
        ],
        "sampleAmounts": [
          11778.48,
          5991.1,
          1007.11,
          13883.01,
          560.38,
          641.08,
          355.18,
          702.36,
          1050.68,
          622.15
        ]
      },
      {
        "merchantGroupId": 7443,
        "merchantName": "Interest",
        "transactionCount": 38,
        "firstDate": "2023-12-15",
        "lastDate": "2025-12-31",
        "daysSinceLastTransaction": 32,
        "dateSpanDays": 747,
        "avgInterval": 20.18918918918919,
        "minInterval": 0,
        "maxInterval": 63,
        "minAmount": 0.01,
        "maxAmount": 0.41,
        "avgAmount": 0.05763157894736834,
        "amountVariance": 0.009197022160664828,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-15",
          "2023-12-29",
          "2023-12-29",
          "2024-01-17",
          "2024-01-31",
          "2024-01-31",
          "2024-01-31",
          "2024-02-15",
          "2024-02-29",
          "2024-03-15"
        ],
        "sampleAmounts": [
          0.09,
          0.41,
          0.39,
          0.1,
          0.01,
          0.03,
          0.04,
          0.21,
          0.01,
          0.21
        ]
      },
      {
        "merchantGroupId": 7329,
        "merchantName": "Dollar Tree",
        "transactionCount": 38,
        "firstDate": "2024-01-30",
        "lastDate": "2026-01-09",
        "daysSinceLastTransaction": 23,
        "dateSpanDays": 710,
        "avgInterval": 19.18918918918919,
        "minInterval": 0,
        "maxInterval": 112,
        "minAmount": 1.25,
        "maxAmount": 58.3,
        "avgAmount": 14.256578947368425,
        "amountVariance": 274.73160145429364,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-30",
          "2024-05-21",
          "2024-06-12",
          "2024-09-09",
          "2024-10-03",
          "2025-01-05",
          "2025-01-24",
          "2025-02-06",
          "2025-05-14",
          "2025-06-06"
        ],
        "sampleAmounts": [
          37.38,
          48.75,
          9.28,
          49.21,
          2.66,
          5.3,
          1.32,
          41.43,
          1.25,
          8.82
        ]
      },
      {
        "merchantGroupId": 7361,
        "merchantName": "Zaxbys",
        "transactionCount": 35,
        "firstDate": "2024-11-29",
        "lastDate": "2026-01-06",
        "daysSinceLastTransaction": 26,
        "dateSpanDays": 403,
        "avgInterval": 11.852941176470589,
        "minInterval": 0,
        "maxInterval": 84,
        "minAmount": 2.58,
        "maxAmount": 72.23,
        "avgAmount": 15.580285714285713,
        "amountVariance": 241.44721420408163,
        "transactionType": "income",
        "sampleDates": [
          "2024-11-29",
          "2024-11-29",
          "2025-01-16",
          "2025-01-20",
          "2025-02-05",
          "2025-02-24",
          "2025-05-19",
          "2025-06-03",
          "2025-06-12",
          "2025-06-17"
        ],
        "sampleAmounts": [
          18.13,
          8.3,
          6.47,
          24.6,
          37.32,
          5.39,
          9.82,
          9.82,
          62.17,
          11.22
        ]
      },
      {
        "merchantGroupId": 7468,
        "merchantName": "Spectrum",
        "transactionCount": 30,
        "firstDate": "2023-12-21",
        "lastDate": "2026-01-21",
        "daysSinceLastTransaction": 11,
        "dateSpanDays": 762,
        "avgInterval": 26.275862068965516,
        "minInterval": 0,
        "maxInterval": 44,
        "minAmount": 26.45,
        "maxAmount": 172.51,
        "avgAmount": 57.48100000000001,
        "amountVariance": 1223.377669,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-21",
          "2024-01-21",
          "2024-02-21",
          "2024-03-21",
          "2024-04-21",
          "2024-05-21",
          "2024-06-21",
          "2024-07-21",
          "2024-08-21",
          "2024-09-21"
        ],
        "sampleAmounts": [
          39.99,
          39.99,
          39.99,
          39.99,
          39.99,
          39.99,
          39.99,
          39.99,
          39.99,
          39.99
        ]
      },
      {
        "merchantGroupId": 7327,
        "merchantName": "Duke Energy",
        "transactionCount": 26,
        "firstDate": "2023-12-13",
        "lastDate": "2026-01-14",
        "daysSinceLastTransaction": 18,
        "dateSpanDays": 763,
        "avgInterval": 30.52,
        "minInterval": 27,
        "maxInterval": 36,
        "minAmount": 75.74,
        "maxAmount": 261.87,
        "avgAmount": 160.50384615384613,
        "amountVariance": 2453.318577514793,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-13",
          "2024-01-18",
          "2024-02-14",
          "2024-03-18",
          "2024-04-17",
          "2024-05-15",
          "2024-06-17",
          "2024-07-17",
          "2024-08-15",
          "2024-09-16"
        ],
        "sampleAmounts": [
          111.41,
          113.88,
          202.37,
          173.5,
          151.45,
          144.03,
          135.42,
          140.74,
          234.88,
          184.26
        ]
      },
      {
        "merchantGroupId": 7322,
        "merchantName": "Scota Karate",
        "transactionCount": 26,
        "firstDate": "2024-01-03",
        "lastDate": "2026-01-05",
        "daysSinceLastTransaction": 27,
        "dateSpanDays": 733,
        "avgInterval": 29.32,
        "minInterval": 4,
        "maxInterval": 34,
        "minAmount": 67,
        "maxAmount": 215,
        "avgAmount": 209.30769230769232,
        "amountVariance": 810.0591715976332,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-03",
          "2024-02-02",
          "2024-03-04",
          "2024-04-02",
          "2024-05-02",
          "2024-06-04",
          "2024-07-02",
          "2024-08-02",
          "2024-09-04",
          "2024-10-02"
        ],
        "sampleAmounts": [
          215,
          215,
          215,
          215,
          215,
          215,
          215,
          215,
          215,
          215
        ]
      },
      {
        "merchantGroupId": 7302,
        "merchantName": "Provident Funding",
        "transactionCount": 26,
        "firstDate": "2024-01-05",
        "lastDate": "2026-01-05",
        "daysSinceLastTransaction": 27,
        "dateSpanDays": 731,
        "avgInterval": 29.24,
        "minInterval": 0,
        "maxInterval": 33,
        "minAmount": 190,
        "maxAmount": 3007.84,
        "avgAmount": 2832.2753846153846,
        "amountVariance": 280833.83619408275,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-05",
          "2024-02-05",
          "2024-03-05",
          "2024-04-05",
          "2024-05-06",
          "2024-06-05",
          "2024-07-05",
          "2024-08-05",
          "2024-09-05",
          "2024-10-07"
        ],
        "sampleAmounts": [
          3007.84,
          3007.84,
          3007.84,
          2901.73,
          2901.73,
          2901.73,
          2901.73,
          2901.73,
          2901.73,
          2901.73
        ]
      },
      {
        "merchantGroupId": 7515,
        "merchantName": "Pay Greer Cpw",
        "transactionCount": 26,
        "firstDate": "2024-01-11",
        "lastDate": "2026-01-11",
        "daysSinceLastTransaction": 21,
        "dateSpanDays": 731,
        "avgInterval": 29.24,
        "minInterval": 2,
        "maxInterval": 31,
        "minAmount": 168.92,
        "maxAmount": 399.4,
        "avgAmount": 267.3580769230769,
        "amountVariance": 3956.2532770710063,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-11",
          "2024-02-11",
          "2024-03-11",
          "2024-04-11",
          "2024-05-11",
          "2024-06-11",
          "2024-07-11",
          "2024-08-11",
          "2024-09-11",
          "2024-10-11"
        ],
        "sampleAmounts": [
          275.97,
          282.96,
          399.4,
          277.54,
          218.6,
          210.25,
          332.09,
          368.73,
          359.06,
          284.48
        ]
      },
      {
        "merchantGroupId": 7575,
        "merchantName": "Dovenmuehle Mtg Mortg Pymt Jonathan Wadsworth",
        "transactionCount": 25,
        "firstDate": "2024-01-02",
        "lastDate": "2026-01-02",
        "daysSinceLastTransaction": 30,
        "dateSpanDays": 731,
        "avgInterval": 30.458333333333332,
        "minInterval": 28,
        "maxInterval": 33,
        "minAmount": 600.76,
        "maxAmount": 624.58,
        "avgAmount": 615.6724000000002,
        "amountVariance": 83.77031424000056,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-02",
          "2024-02-01",
          "2024-03-01",
          "2024-04-01",
          "2024-05-01",
          "2024-06-03",
          "2024-07-01",
          "2024-08-01",
          "2024-09-03",
          "2024-10-01"
        ],
        "sampleAmounts": [
          609.41,
          609.41,
          609.41,
          624.58,
          624.58,
          624.58,
          624.58,
          624.58,
          624.58,
          624.58
        ]
      },
      {
        "merchantGroupId": 7535,
        "merchantName": "Transfer From Jonathan R Wadsworth Business Market...",
        "transactionCount": 23,
        "firstDate": "2023-12-11",
        "lastDate": "2024-11-25",
        "daysSinceLastTransaction": 433,
        "dateSpanDays": 350,
        "avgInterval": 15.909090909090908,
        "minInterval": 0,
        "maxInterval": 55,
        "minAmount": 450,
        "maxAmount": 17000,
        "avgAmount": 5591.304347826087,
        "amountVariance": 17226663.51606805,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-11",
          "2023-12-11",
          "2023-12-11",
          "2023-12-26",
          "2024-02-07",
          "2024-02-07",
          "2024-02-23",
          "2024-04-05",
          "2024-04-30",
          "2024-04-30"
        ],
        "sampleAmounts": [
          12000,
          9000,
          2000,
          3000,
          6000,
          12000,
          5000,
          8000,
          8000,
          5000
        ]
      },
      {
        "merchantGroupId": 7311,
        "merchantName": "Little Caesars",
        "transactionCount": 22,
        "firstDate": "2024-12-01",
        "lastDate": "2026-01-24",
        "daysSinceLastTransaction": 8,
        "dateSpanDays": 419,
        "avgInterval": 19.952380952380953,
        "minInterval": 0,
        "maxInterval": 92,
        "minAmount": 5.93,
        "maxAmount": 30.37,
        "avgAmount": 12.11909090909091,
        "amountVariance": 29.823462809917352,
        "transactionType": "income",
        "sampleDates": [
          "2024-12-01",
          "2024-12-01",
          "2024-12-04",
          "2025-02-28",
          "2025-05-31",
          "2025-06-09",
          "2025-06-22",
          "2025-07-07",
          "2025-07-23",
          "2025-08-01"
        ],
        "sampleAmounts": [
          6.47,
          5.93,
          7.34,
          7.34,
          16.31,
          30.37,
          19.21,
          10.79,
          7.34,
          10.25
        ]
      },
      {
        "merchantGroupId": 7440,
        "merchantName": "Venmo Jonathan Wadsworth",
        "transactionCount": 20,
        "firstDate": "2024-01-08",
        "lastDate": "2025-11-03",
        "daysSinceLastTransaction": 90,
        "dateSpanDays": 665,
        "avgInterval": 35,
        "minInterval": 0,
        "maxInterval": 132,
        "minAmount": 3,
        "maxAmount": 1050,
        "avgAmount": 159.39000000000001,
        "amountVariance": 60544.8299,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-08",
          "2024-01-23",
          "2024-02-20",
          "2024-03-27",
          "2024-04-08",
          "2024-06-20",
          "2024-09-03",
          "2025-01-13",
          "2025-03-27",
          "2025-06-16"
        ],
        "sampleAmounts": [
          225,
          5,
          40,
          25,
          200,
          475,
          143,
          80,
          75,
          485
        ]
      },
      {
        "merchantGroupId": 7359,
        "merchantName": "Wendys",
        "transactionCount": 20,
        "firstDate": "2025-01-25",
        "lastDate": "2026-01-06",
        "daysSinceLastTransaction": 26,
        "dateSpanDays": 346,
        "avgInterval": 18.210526315789473,
        "minInterval": 0,
        "maxInterval": 84,
        "minAmount": 2.37,
        "maxAmount": 72,
        "avgAmount": 11.825,
        "amountVariance": 240.31208499999997,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-25",
          "2025-02-22",
          "2025-05-17",
          "2025-06-01",
          "2025-06-20",
          "2025-07-02",
          "2025-07-07",
          "2025-07-27",
          "2025-07-27",
          "2025-08-03"
        ],
        "sampleAmounts": [
          4.31,
          2.37,
          17.49,
          10.78,
          24.63,
          7.56,
          9.72,
          2.37,
          27.21,
          8.64
        ]
      },
      {
        "merchantGroupId": 7456,
        "merchantName": "Google",
        "transactionCount": 18,
        "firstDate": "2024-06-01",
        "lastDate": "2025-08-01",
        "daysSinceLastTransaction": 184,
        "dateSpanDays": 426,
        "avgInterval": 25.058823529411764,
        "minInterval": 0,
        "maxInterval": 122,
        "minAmount": 1.96,
        "maxAmount": 105.99,
        "avgAmount": 27.88611111111111,
        "amountVariance": 1388.8563793209878,
        "transactionType": "expense",
        "sampleDates": [
          "2024-06-01",
          "2024-06-01",
          "2024-07-01",
          "2024-07-01",
          "2024-08-01",
          "2024-12-01",
          "2025-02-01",
          "2025-02-16",
          "2025-03-01",
          "2025-05-01"
        ],
        "sampleAmounts": [
          7.63,
          7.63,
          7.63,
          7.63,
          7.63,
          7.63,
          7.63,
          105.99,
          7.63,
          84.5
        ]
      },
      {
        "merchantGroupId": 7351,
        "merchantName": "Arbys",
        "transactionCount": 17,
        "firstDate": "2024-01-13",
        "lastDate": "2026-01-24",
        "daysSinceLastTransaction": 8,
        "dateSpanDays": 742,
        "avgInterval": 46.375,
        "minInterval": 0,
        "maxInterval": 328,
        "minAmount": 2.7,
        "maxAmount": 14.87,
        "avgAmount": 7.305882352941175,
        "amountVariance": 8.935412456747406,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-13",
          "2024-12-06",
          "2024-12-06",
          "2025-01-15",
          "2025-05-21",
          "2025-06-17",
          "2025-07-09",
          "2025-07-17",
          "2025-09-08",
          "2025-09-14"
        ],
        "sampleAmounts": [
          4.69,
          9.7,
          6.48,
          2.7,
          6.04,
          3.88,
          6.04,
          6.86,
          7.43,
          12.83
        ]
      },
      {
        "merchantGroupId": 7539,
        "merchantName": "Runcloud Sdn Bhd Cyberjaya Se",
        "transactionCount": 17,
        "firstDate": "2024-08-18",
        "lastDate": "2026-01-03",
        "daysSinceLastTransaction": 29,
        "dateSpanDays": 503,
        "avgInterval": 31.4375,
        "minInterval": 28,
        "maxInterval": 46,
        "minAmount": 8.52,
        "maxAmount": 19,
        "avgAmount": 10.639411764705883,
        "amountVariance": 11.533087889273359,
        "transactionType": "expense",
        "sampleDates": [
          "2024-08-18",
          "2024-09-18",
          "2024-10-18",
          "2024-11-18",
          "2025-01-03",
          "2025-02-03",
          "2025-03-03",
          "2025-04-03",
          "2025-05-03",
          "2025-06-03"
        ],
        "sampleAmounts": [
          11.35,
          15,
          19,
          19,
          8.52,
          9,
          9,
          9,
          9,
          9
        ]
      },
      {
        "merchantGroupId": 7352,
        "merchantName": "Burger King",
        "transactionCount": 17,
        "firstDate": "2024-11-29",
        "lastDate": "2026-01-19",
        "daysSinceLastTransaction": 13,
        "dateSpanDays": 416,
        "avgInterval": 26,
        "minInterval": 0,
        "maxInterval": 118,
        "minAmount": 1.72,
        "maxAmount": 20.33,
        "avgAmount": 7.591764705882353,
        "amountVariance": 17.66472041522491,
        "transactionType": "income",
        "sampleDates": [
          "2024-11-29",
          "2024-12-01",
          "2024-12-05",
          "2025-01-13",
          "2025-05-11",
          "2025-06-07",
          "2025-07-12",
          "2025-07-21",
          "2025-10-06",
          "2025-10-08"
        ],
        "sampleAmounts": [
          11.86,
          8.73,
          5.71,
          5.93,
          20.33,
          12.96,
          3.88,
          5.4,
          7.47,
          5.93
        ]
      },
      {
        "merchantGroupId": 7450,
        "merchantName": "GoodWill",
        "transactionCount": 16,
        "firstDate": "2025-05-29",
        "lastDate": "2025-12-31",
        "daysSinceLastTransaction": 32,
        "dateSpanDays": 216,
        "avgInterval": 14.4,
        "minInterval": 0,
        "maxInterval": 94,
        "minAmount": 1,
        "maxAmount": 30.94,
        "avgAmount": 10.07,
        "amountVariance": 55.12743749999999,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-29",
          "2025-06-07",
          "2025-06-07",
          "2025-07-04",
          "2025-07-13",
          "2025-07-13",
          "2025-07-24",
          "2025-07-27",
          "2025-10-29",
          "2025-11-07"
        ],
        "sampleAmounts": [
          1,
          11.74,
          17.23,
          6,
          7.98,
          7,
          8,
          1,
          16,
          5.98
        ]
      },
      {
        "merchantGroupId": 7401,
        "merchantName": "Deposit Ref Number",
        "transactionCount": 15,
        "firstDate": "2023-12-20",
        "lastDate": "2025-12-26",
        "daysSinceLastTransaction": 37,
        "dateSpanDays": 737,
        "avgInterval": 52.642857142857146,
        "minInterval": 0,
        "maxInterval": 209,
        "minAmount": 2.5,
        "maxAmount": 4456.28,
        "avgAmount": 624.0020000000001,
        "amountVariance": 1245262.6021093333,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-20",
          "2024-01-26",
          "2024-02-22",
          "2024-03-05",
          "2024-03-12",
          "2024-10-07",
          "2024-10-07",
          "2025-01-13",
          "2025-01-13",
          "2025-03-10"
        ],
        "sampleAmounts": [
          1783.88,
          591,
          600,
          4456.28,
          50,
          10,
          642.1,
          455.85,
          2.5,
          135
        ]
      },
      {
        "merchantGroupId": 7481,
        "merchantName": "Home Depot",
        "transactionCount": 15,
        "firstDate": "2024-05-23",
        "lastDate": "2025-09-29",
        "daysSinceLastTransaction": 125,
        "dateSpanDays": 494,
        "avgInterval": 35.285714285714285,
        "minInterval": 0,
        "maxInterval": 307,
        "minAmount": 4.22,
        "maxAmount": 189.74,
        "avgAmount": 67.938,
        "amountVariance": 3470.673629333334,
        "transactionType": "income",
        "sampleDates": [
          "2024-05-23",
          "2024-07-28",
          "2025-05-31",
          "2025-06-01",
          "2025-06-05",
          "2025-06-09",
          "2025-06-09",
          "2025-06-22",
          "2025-06-26",
          "2025-07-17"
        ],
        "sampleAmounts": [
          33.77,
          135.09,
          64.87,
          4.22,
          62.64,
          16.8,
          18.15,
          11.1,
          23.64,
          189.74
        ]
      },
      {
        "merchantGroupId": 7347,
        "merchantName": "Tropical Grille",
        "transactionCount": 15,
        "firstDate": "2025-06-09",
        "lastDate": "2026-01-15",
        "daysSinceLastTransaction": 17,
        "dateSpanDays": 220,
        "avgInterval": 15.714285714285714,
        "minInterval": 1,
        "maxInterval": 62,
        "minAmount": 5.28,
        "maxAmount": 72.4,
        "avgAmount": 28.037333333333333,
        "amountVariance": 463.4973395555555,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-09",
          "2025-06-15",
          "2025-06-16",
          "2025-07-23",
          "2025-07-31",
          "2025-09-13",
          "2025-09-19",
          "2025-09-24",
          "2025-10-02",
          "2025-10-13"
        ],
        "sampleAmounts": [
          12.3,
          72.4,
          60.48,
          10.25,
          10.25,
          22.88,
          11.76,
          45.23,
          29.69,
          12
        ]
      },
      {
        "merchantGroupId": 7502,
        "merchantName": "Lowes",
        "transactionCount": 13,
        "firstDate": "2024-09-01",
        "lastDate": "2026-01-21",
        "daysSinceLastTransaction": 11,
        "dateSpanDays": 507,
        "avgInterval": 42.25,
        "minInterval": 0,
        "maxInterval": 157,
        "minAmount": 2.71,
        "maxAmount": 893.9,
        "avgAmount": 149.03846153846155,
        "amountVariance": 55286.19982840237,
        "transactionType": "income",
        "sampleDates": [
          "2024-09-01",
          "2024-10-01",
          "2024-10-09",
          "2025-03-15",
          "2025-06-01",
          "2025-06-03",
          "2025-06-22",
          "2025-06-22",
          "2025-11-17",
          "2025-11-18"
        ],
        "sampleAmounts": [
          210.94,
          63.58,
          359.32,
          26.5,
          2.71,
          66.91,
          893.9,
          75.22,
          40.18,
          115.54
        ]
      },
      {
        "merchantGroupId": 7320,
        "merchantName": "Northhillschurch.com",
        "transactionCount": 13,
        "firstDate": "2024-11-16",
        "lastDate": "2025-11-24",
        "daysSinceLastTransaction": 69,
        "dateSpanDays": 373,
        "avgInterval": 31.083333333333332,
        "minInterval": 9,
        "maxInterval": 91,
        "minAmount": 15,
        "maxAmount": 6305,
        "avgAmount": 1182.8269230769233,
        "amountVariance": 3739700.270852071,
        "transactionType": "income",
        "sampleDates": [
          "2024-11-16",
          "2025-01-14",
          "2025-03-02",
          "2025-06-01",
          "2025-06-19",
          "2025-07-01",
          "2025-07-11",
          "2025-07-20",
          "2025-08-01",
          "2025-09-02"
        ],
        "sampleAmounts": [
          6305,
          650,
          250,
          511.29,
          15,
          511.29,
          30,
          70,
          511.29,
          500
        ]
      },
      {
        "merchantGroupId": 7441,
        "merchantName": "Texas Roadhouse",
        "transactionCount": 13,
        "firstDate": "2025-05-22",
        "lastDate": "2026-01-10",
        "daysSinceLastTransaction": 22,
        "dateSpanDays": 233,
        "avgInterval": 19.416666666666668,
        "minInterval": 7,
        "maxInterval": 50,
        "minAmount": 23.94,
        "maxAmount": 40.73,
        "avgAmount": 36.293076923076924,
        "amountVariance": 17.164359763313602,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-22",
          "2025-05-30",
          "2025-06-14",
          "2025-07-19",
          "2025-08-02",
          "2025-09-18",
          "2025-09-26",
          "2025-10-10",
          "2025-11-29",
          "2025-12-06"
        ],
        "sampleAmounts": [
          38.2,
          35.92,
          40.14,
          36.57,
          39.15,
          39.49,
          33.02,
          40.73,
          36.91,
          37.1
        ]
      },
      {
        "merchantGroupId": 7314,
        "merchantName": "Jack In The Box",
        "transactionCount": 13,
        "firstDate": "2025-07-13",
        "lastDate": "2025-12-16",
        "daysSinceLastTransaction": 47,
        "dateSpanDays": 156,
        "avgInterval": 13,
        "minInterval": 1,
        "maxInterval": 50,
        "minAmount": 4.96,
        "maxAmount": 27.33,
        "avgAmount": 10.09,
        "amountVariance": 35.92721538461538,
        "transactionType": "expense",
        "sampleDates": [
          "2025-07-13",
          "2025-07-14",
          "2025-09-02",
          "2025-09-05",
          "2025-09-06",
          "2025-09-09",
          "2025-09-18",
          "2025-09-24",
          "2025-10-16",
          "2025-11-05"
        ],
        "sampleAmounts": [
          15.74,
          8.19,
          11.65,
          12.94,
          10.36,
          9.93,
          4.96,
          27.33,
          5.39,
          4.96
        ]
      },
      {
        "merchantGroupId": 7449,
        "merchantName": "Lowes Credit Card",
        "transactionCount": 12,
        "firstDate": "2023-12-18",
        "lastDate": "2025-10-09",
        "daysSinceLastTransaction": 115,
        "dateSpanDays": 661,
        "avgInterval": 60.09090909090909,
        "minInterval": 19,
        "maxInterval": 305,
        "minAmount": 30.16,
        "maxAmount": 1481.93,
        "avgAmount": 537.2500000000001,
        "amountVariance": 269237.23786666663,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-18",
          "2024-02-12",
          "2024-03-14",
          "2024-04-22",
          "2024-05-20",
          "2024-07-15",
          "2024-08-13",
          "2024-09-12",
          "2025-07-14",
          "2025-08-14"
        ],
        "sampleAmounts": [
          1226.67,
          689.99,
          540.03,
          1252.61,
          73.25,
          59.48,
          778.92,
          34.35,
          147.26,
          132.35
        ]
      },
      {
        "merchantGroupId": 7446,
        "merchantName": "American Tree Land",
        "transactionCount": 12,
        "firstDate": "2024-02-26",
        "lastDate": "2026-01-06",
        "daysSinceLastTransaction": 26,
        "dateSpanDays": 680,
        "avgInterval": 61.81818181818182,
        "minInterval": 0,
        "maxInterval": 203,
        "minAmount": 126.57,
        "maxAmount": 13132.5,
        "avgAmount": 2140.0291666666667,
        "amountVariance": 12216511.623924302,
        "transactionType": "expense",
        "sampleDates": [
          "2024-02-26",
          "2024-03-13",
          "2024-04-12",
          "2024-05-28",
          "2024-05-28",
          "2024-08-07",
          "2024-08-15",
          "2024-10-30",
          "2024-11-13",
          "2025-01-07"
        ],
        "sampleAmounts": [
          13132.5,
          1620,
          127.1,
          126.57,
          1169.18,
          615,
          360,
          1050,
          780,
          1400
        ]
      },
      {
        "merchantGroupId": 7349,
        "merchantName": "Robinhood Card Main Checking",
        "transactionCount": 12,
        "firstDate": "2024-06-12",
        "lastDate": "2026-01-20",
        "daysSinceLastTransaction": 12,
        "dateSpanDays": 587,
        "avgInterval": 53.36363636363637,
        "minInterval": 3,
        "maxInterval": 209,
        "minAmount": 5,
        "maxAmount": 18215.7,
        "avgAmount": 4593.99,
        "amountVariance": 26202647.690483335,
        "transactionType": "expense",
        "sampleDates": [
          "2024-06-12",
          "2024-07-26",
          "2024-07-29",
          "2024-09-09",
          "2024-11-05",
          "2025-01-14",
          "2025-03-25",
          "2025-10-20",
          "2025-11-20",
          "2025-12-02"
        ],
        "sampleAmounts": [
          150,
          10000,
          8122,
          18215.7,
          5,
          1500,
          1289.2,
          4365.78,
          2340.61,
          50
        ]
      },
      {
        "merchantGroupId": 7307,
        "merchantName": "Allstate",
        "transactionCount": 11,
        "firstDate": "2024-05-23",
        "lastDate": "2025-11-25",
        "daysSinceLastTransaction": 68,
        "dateSpanDays": 551,
        "avgInterval": 55.1,
        "minInterval": 7,
        "maxInterval": 153,
        "minAmount": 36.59,
        "maxAmount": 6000,
        "avgAmount": 1204.472727272727,
        "amountVariance": 2625923.87227438,
        "transactionType": "expense",
        "sampleDates": [
          "2024-05-23",
          "2024-10-23",
          "2024-11-06",
          "2024-11-25",
          "2025-02-03",
          "2025-05-27",
          "2025-06-24",
          "2025-07-16",
          "2025-07-23",
          "2025-11-05"
        ],
        "sampleAmounts": [
          400.01,
          192.67,
          501.43,
          917.83,
          36.59,
          944.05,
          6000,
          2159.48,
          204.97,
          659.38
        ]
      },
      {
        "merchantGroupId": 7321,
        "merchantName": "Smoothie King",
        "transactionCount": 11,
        "firstDate": "2025-05-19",
        "lastDate": "2025-10-25",
        "daysSinceLastTransaction": 99,
        "dateSpanDays": 159,
        "avgInterval": 15.9,
        "minInterval": 0,
        "maxInterval": 52,
        "minAmount": 3.66,
        "maxAmount": 36.03,
        "avgAmount": 14.862727272727271,
        "amountVariance": 83.73061983471075,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-19",
          "2025-06-27",
          "2025-07-11",
          "2025-07-11",
          "2025-07-16",
          "2025-09-06",
          "2025-09-10",
          "2025-09-10",
          "2025-09-14",
          "2025-10-25"
        ],
        "sampleAmounts": [
          3.66,
          18.77,
          7.62,
          18.5,
          7.98,
          23.08,
          18.51,
          5.39,
          15.97,
          36.03
        ]
      },
      {
        "merchantGroupId": 7424,
        "merchantName": "Transfer To Wadsworth J Complete Advantage Rm Xxxx...",
        "transactionCount": 10,
        "firstDate": "2023-12-11",
        "lastDate": "2024-05-03",
        "daysSinceLastTransaction": 639,
        "dateSpanDays": 144,
        "avgInterval": 16,
        "minInterval": 0,
        "maxInterval": 58,
        "minAmount": 2000,
        "maxAmount": 12000,
        "avgAmount": 6950,
        "amountVariance": 11022500,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-11",
          "2023-12-11",
          "2023-12-11",
          "2024-02-07",
          "2024-02-07",
          "2024-02-23",
          "2024-04-05",
          "2024-04-30",
          "2024-04-30",
          "2024-05-03"
        ],
        "sampleAmounts": [
          9000,
          2000,
          12000,
          6000,
          12000,
          5000,
          8000,
          5000,
          8000,
          2500
        ]
      },
      {
        "merchantGroupId": 7313,
        "merchantName": "Harris Teeter",
        "transactionCount": 10,
        "firstDate": "2025-05-27",
        "lastDate": "2025-11-06",
        "daysSinceLastTransaction": 87,
        "dateSpanDays": 163,
        "avgInterval": 18.11111111111111,
        "minInterval": 0,
        "maxInterval": 70,
        "minAmount": 2.98,
        "maxAmount": 35.09,
        "avgAmount": 11.747000000000002,
        "amountVariance": 96.59816100000002,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-27",
          "2025-05-27",
          "2025-06-08",
          "2025-06-20",
          "2025-06-24",
          "2025-06-26",
          "2025-07-06",
          "2025-07-10",
          "2025-09-18",
          "2025-11-06"
        ],
        "sampleAmounts": [
          5.47,
          15.84,
          6.28,
          35.09,
          23.87,
          2.98,
          4.47,
          8.99,
          9.48,
          5
        ]
      },
      {
        "merchantGroupId": 7300,
        "merchantName": "Groundfloor",
        "transactionCount": 9,
        "firstDate": "2023-12-20",
        "lastDate": "2025-07-16",
        "daysSinceLastTransaction": 200,
        "dateSpanDays": 574,
        "avgInterval": 71.75,
        "minInterval": 14,
        "maxInterval": 168,
        "minAmount": 63.94,
        "maxAmount": 3470.67,
        "avgAmount": 722.6144444444444,
        "amountVariance": 1118191.3085802468,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-20",
          "2024-03-06",
          "2024-05-07",
          "2024-07-31",
          "2024-08-14",
          "2024-10-09",
          "2025-03-26",
          "2025-05-30",
          "2025-07-16"
        ],
        "sampleAmounts": [
          1500,
          3470.67,
          459.17,
          370.63,
          170.88,
          63.94,
          141.28,
          243.52,
          83.44
        ]
      },
      {
        "merchantGroupId": 7398,
        "merchantName": "Transfer To Wadsworth J Everyday Checking Xxxxxx44...",
        "transactionCount": 9,
        "firstDate": "2023-12-26",
        "lastDate": "2025-06-23",
        "daysSinceLastTransaction": 223,
        "dateSpanDays": 545,
        "avgInterval": 68.125,
        "minInterval": 0,
        "maxInterval": 253,
        "minAmount": 50,
        "maxAmount": 17000,
        "avgAmount": 6064.944444444444,
        "amountVariance": 27232995.02469136,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-26",
          "2024-09-04",
          "2024-09-09",
          "2024-09-09",
          "2024-09-09",
          "2024-11-25",
          "2024-12-27",
          "2025-03-25",
          "2025-06-23"
        ],
        "sampleAmounts": [
          225,
          50,
          7000,
          5000,
          17000,
          10000,
          309.5,
          7000,
          8000
        ]
      },
      {
        "merchantGroupId": 7345,
        "merchantName": "Ross Dress For Less",
        "transactionCount": 9,
        "firstDate": "2024-01-25",
        "lastDate": "2025-12-07",
        "daysSinceLastTransaction": 56,
        "dateSpanDays": 682,
        "avgInterval": 85.25,
        "minInterval": 0,
        "maxInterval": 490,
        "minAmount": 6.35,
        "maxAmount": 24.36,
        "avgAmount": 15.525555555555554,
        "amountVariance": 32.355313580246914,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-25",
          "2025-05-29",
          "2025-07-27",
          "2025-10-06",
          "2025-10-11",
          "2025-11-07",
          "2025-12-07",
          "2025-12-07",
          "2025-12-07"
        ],
        "sampleAmounts": [
          15.89,
          24.36,
          9.53,
          6.35,
          10.59,
          13.77,
          16.92,
          21.16,
          21.16
        ]
      },
      {
        "merchantGroupId": 7397,
        "merchantName": "Transfer To Wadsworth J Ref Ib0t7zhf9z Everyday Ch...",
        "transactionCount": 9,
        "firstDate": "2024-10-10",
        "lastDate": "2025-09-29",
        "daysSinceLastTransaction": 125,
        "dateSpanDays": 354,
        "avgInterval": 44.25,
        "minInterval": 0,
        "maxInterval": 86,
        "minAmount": 1.65,
        "maxAmount": 10000,
        "avgAmount": 4853.294444444445,
        "amountVariance": 11728520.449135803,
        "transactionType": "expense",
        "sampleDates": [
          "2024-10-10",
          "2024-10-28",
          "2024-12-16",
          "2025-01-06",
          "2025-04-02",
          "2025-05-20",
          "2025-07-22",
          "2025-07-22",
          "2025-09-29"
        ],
        "sampleAmounts": [
          1800,
          1.65,
          10000,
          2000,
          6878,
          7000,
          1000,
          8000,
          7000
        ]
      },
      {
        "merchantGroupId": 7451,
        "merchantName": "Moes",
        "transactionCount": 9,
        "firstDate": "2025-01-08",
        "lastDate": "2026-01-09",
        "daysSinceLastTransaction": 23,
        "dateSpanDays": 366,
        "avgInterval": 45.75,
        "minInterval": 0,
        "maxInterval": 118,
        "minAmount": 11.1,
        "maxAmount": 45.17,
        "avgAmount": 28.047777777777778,
        "amountVariance": 161.6701950617284,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-08",
          "2025-03-02",
          "2025-05-14",
          "2025-07-06",
          "2025-11-01",
          "2025-11-01",
          "2025-11-28",
          "2025-11-28",
          "2026-01-09"
        ],
        "sampleAmounts": [
          39.92,
          21.6,
          41.05,
          41.48,
          11.1,
          17.25,
          16.9,
          17.96,
          45.17
        ]
      },
      {
        "merchantGroupId": 7325,
        "merchantName": "Compassion International",
        "transactionCount": 9,
        "firstDate": "2025-05-05",
        "lastDate": "2026-01-05",
        "daysSinceLastTransaction": 27,
        "dateSpanDays": 245,
        "avgInterval": 30.625,
        "minInterval": 10,
        "maxInterval": 62,
        "minAmount": 10,
        "maxAmount": 43,
        "avgAmount": 39.333333333333336,
        "amountVariance": 107.55555555555556,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-05",
          "2025-06-05",
          "2025-07-05",
          "2025-09-05",
          "2025-10-05",
          "2025-11-05",
          "2025-11-25",
          "2025-12-05",
          "2026-01-05"
        ],
        "sampleAmounts": [
          43,
          43,
          43,
          43,
          43,
          43,
          10,
          43,
          43
        ]
      },
      {
        "merchantGroupId": 7348,
        "merchantName": "Firehouse Subs",
        "transactionCount": 9,
        "firstDate": "2025-05-12",
        "lastDate": "2025-11-20",
        "daysSinceLastTransaction": 73,
        "dateSpanDays": 192,
        "avgInterval": 24,
        "minInterval": 0,
        "maxInterval": 105,
        "minAmount": 1.07,
        "maxAmount": 39.32,
        "avgAmount": 12.064444444444442,
        "amountVariance": 132.33664691358024,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-12",
          "2025-06-09",
          "2025-06-15",
          "2025-06-29",
          "2025-06-29",
          "2025-10-12",
          "2025-11-12",
          "2025-11-16",
          "2025-11-20"
        ],
        "sampleAmounts": [
          22,
          9.93,
          39.32,
          6.26,
          9.93,
          1.4,
          3.99,
          1.07,
          14.68
        ]
      },
      {
        "merchantGroupId": 7357,
        "merchantName": "Target",
        "transactionCount": 9,
        "firstDate": "2025-06-20",
        "lastDate": "2025-11-28",
        "daysSinceLastTransaction": 65,
        "dateSpanDays": 161,
        "avgInterval": 20.125,
        "minInterval": 1,
        "maxInterval": 59,
        "minAmount": 3.1,
        "maxAmount": 96.43,
        "avgAmount": 26.39444444444445,
        "amountVariance": 767.790913580247,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-20",
          "2025-07-02",
          "2025-07-12",
          "2025-09-09",
          "2025-09-10",
          "2025-09-22",
          "2025-09-27",
          "2025-11-08",
          "2025-11-28"
        ],
        "sampleAmounts": [
          3.1,
          12.17,
          3.79,
          96.43,
          37.09,
          32,
          4.49,
          16.68,
          31.8
        ]
      },
      {
        "merchantGroupId": 7416,
        "merchantName": "Patriot Pest Management",
        "transactionCount": 8,
        "firstDate": "2024-01-09",
        "lastDate": "2025-09-03",
        "daysSinceLastTransaction": 151,
        "dateSpanDays": 603,
        "avgInterval": 86.14285714285714,
        "minInterval": 67,
        "maxInterval": 101,
        "minAmount": 90,
        "maxAmount": 90,
        "avgAmount": 90,
        "amountVariance": 0,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-09",
          "2024-04-08",
          "2024-07-12",
          "2024-10-03",
          "2024-12-30",
          "2025-03-07",
          "2025-06-16",
          "2025-09-03"
        ],
        "sampleAmounts": [
          90,
          90,
          90,
          90,
          90,
          90,
          90,
          90
        ]
      },
      {
        "merchantGroupId": 7444,
        "merchantName": "Flagstar Bank",
        "transactionCount": 8,
        "firstDate": "2024-06-05",
        "lastDate": "2025-10-01",
        "daysSinceLastTransaction": 123,
        "dateSpanDays": 483,
        "avgInterval": 69,
        "minInterval": 26,
        "maxInterval": 105,
        "minAmount": 5194.61,
        "maxAmount": 30075,
        "avgAmount": 14048.7875,
        "amountVariance": 56668878.574468754,
        "transactionType": "expense",
        "sampleDates": [
          "2024-06-05",
          "2024-09-10",
          "2024-10-08",
          "2025-01-21",
          "2025-04-14",
          "2025-07-24",
          "2025-09-05",
          "2025-10-01"
        ],
        "sampleAmounts": [
          15000,
          30075,
          10000,
          20417.78,
          7246.52,
          10310.7,
          5194.61,
          14145.69
        ]
      },
      {
        "merchantGroupId": 7485,
        "merchantName": "Harbor Freight Tools",
        "transactionCount": 8,
        "firstDate": "2025-01-15",
        "lastDate": "2025-12-10",
        "daysSinceLastTransaction": 53,
        "dateSpanDays": 329,
        "avgInterval": 47,
        "minInterval": 0,
        "maxInterval": 133,
        "minAmount": 2.43,
        "maxAmount": 275.56,
        "avgAmount": 57.30375,
        "amountVariance": 7445.6651984375,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-15",
          "2025-05-23",
          "2025-05-31",
          "2025-06-01",
          "2025-06-05",
          "2025-06-05",
          "2025-07-30",
          "2025-12-10"
        ],
        "sampleAmounts": [
          2.43,
          8.69,
          83.56,
          12.47,
          40.79,
          275.56,
          3.17,
          31.76
        ]
      },
      {
        "merchantGroupId": 7293,
        "merchantName": "Taco Bell",
        "transactionCount": 8,
        "firstDate": "2025-07-09",
        "lastDate": "2026-01-12",
        "daysSinceLastTransaction": 20,
        "dateSpanDays": 187,
        "avgInterval": 26.714285714285715,
        "minInterval": 1,
        "maxInterval": 89,
        "minAmount": 2.61,
        "maxAmount": 14.86,
        "avgAmount": 6.44625,
        "amountVariance": 16.9248734375,
        "transactionType": "expense",
        "sampleDates": [
          "2025-07-09",
          "2025-10-06",
          "2025-10-07",
          "2025-10-13",
          "2025-10-25",
          "2025-10-27",
          "2025-11-18",
          "2026-01-12"
        ],
        "sampleAmounts": [
          14.86,
          2.61,
          10.12,
          2.61,
          5.16,
          5.21,
          2.61,
          8.39
        ]
      },
      {
        "merchantGroupId": 7340,
        "merchantName": "Zoom",
        "transactionCount": 7,
        "firstDate": "2023-12-17",
        "lastDate": "2024-09-28",
        "daysSinceLastTransaction": 491,
        "dateSpanDays": 286,
        "avgInterval": 47.666666666666664,
        "minInterval": 14,
        "maxInterval": 163,
        "minAmount": 4.99,
        "maxAmount": 15.99,
        "avgAmount": 9.311428571428573,
        "amountVariance": 25.61989795918367,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-17",
          "2024-01-17",
          "2024-06-28",
          "2024-07-12",
          "2024-07-28",
          "2024-08-28",
          "2024-09-28"
        ],
        "sampleAmounts": [
          15.99,
          15.99,
          4.99,
          13.24,
          4.99,
          4.99,
          4.99
        ]
      },
      {
        "merchantGroupId": 7452,
        "merchantName": "76 Petroleum",
        "transactionCount": 7,
        "firstDate": "2025-01-23",
        "lastDate": "2026-01-24",
        "daysSinceLastTransaction": 8,
        "dateSpanDays": 366,
        "avgInterval": 61,
        "minInterval": 6,
        "maxInterval": 150,
        "minAmount": 17.75,
        "maxAmount": 43.47,
        "avgAmount": 30.314285714285713,
        "amountVariance": 107.13173877551021,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-23",
          "2025-02-18",
          "2025-07-18",
          "2025-11-04",
          "2025-11-10",
          "2025-12-03",
          "2026-01-24"
        ],
        "sampleAmounts": [
          18.02,
          17.75,
          25,
          43.04,
          38.31,
          43.47,
          26.61
        ]
      },
      {
        "merchantGroupId": 7297,
        "merchantName": "Power Homeschool",
        "transactionCount": 7,
        "firstDate": "2025-05-27",
        "lastDate": "2025-12-25",
        "daysSinceLastTransaction": 38,
        "dateSpanDays": 212,
        "avgInterval": 35.333333333333336,
        "minInterval": 28,
        "maxInterval": 59,
        "minAmount": 25,
        "maxAmount": 31.25,
        "avgAmount": 28.571428571428573,
        "amountVariance": 9.566326530612244,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-27",
          "2025-06-27",
          "2025-07-29",
          "2025-09-26",
          "2025-10-29",
          "2025-11-27",
          "2025-12-25"
        ],
        "sampleAmounts": [
          25,
          25,
          25,
          31.25,
          31.25,
          31.25,
          31.25
        ]
      },
      {
        "merchantGroupId": 7396,
        "merchantName": "Transfer To Wadsworth J Ref Ib0nfs7bjw Complete Ad...",
        "transactionCount": 6,
        "firstDate": "2023-12-26",
        "lastDate": "2024-10-28",
        "daysSinceLastTransaction": 461,
        "dateSpanDays": 307,
        "avgInterval": 61.4,
        "minInterval": 0,
        "maxInterval": 147,
        "minAmount": 1.38,
        "maxAmount": 10000,
        "avgAmount": 2910.831666666667,
        "amountVariance": 12920855.881080555,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-26",
          "2024-05-21",
          "2024-05-22",
          "2024-06-04",
          "2024-10-28",
          "2024-10-28"
        ],
        "sampleAmounts": [
          3000,
          51.25,
          10000,
          4400,
          12.36,
          1.38
        ]
      },
      {
        "merchantGroupId": 7399,
        "merchantName": "Transfer Ref Ib0rlwbvjk To Signify Business Essent...",
        "transactionCount": 6,
        "firstDate": "2024-01-17",
        "lastDate": "2026-01-05",
        "daysSinceLastTransaction": 27,
        "dateSpanDays": 719,
        "avgInterval": 143.8,
        "minInterval": 34,
        "maxInterval": 300,
        "minAmount": 105.99,
        "maxAmount": 17307.82,
        "avgAmount": 4475.483333333334,
        "amountVariance": 37539944.267355554,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-17",
          "2024-04-30",
          "2024-06-03",
          "2024-12-30",
          "2025-03-11",
          "2026-01-05"
        ],
        "sampleAmounts": [
          6000,
          17307.82,
          3130.22,
          182.07,
          105.99,
          126.8
        ]
      },
      {
        "merchantGroupId": 7542,
        "merchantName": "Check 417",
        "transactionCount": 6,
        "firstDate": "2024-02-01",
        "lastDate": "2025-07-07",
        "daysSinceLastTransaction": 209,
        "dateSpanDays": 522,
        "avgInterval": 104.4,
        "minInterval": 1,
        "maxInterval": 474,
        "minAmount": 2000,
        "maxAmount": 10000,
        "avgAmount": 4800,
        "amountVariance": 7316666.666666667,
        "transactionType": "expense",
        "sampleDates": [
          "2024-02-01",
          "2024-02-02",
          "2024-02-08",
          "2024-02-12",
          "2024-03-20",
          "2025-07-07"
        ],
        "sampleAmounts": [
          6000,
          2000,
          2500,
          10000,
          3300,
          5000
        ]
      },
      {
        "merchantGroupId": 7369,
        "merchantName": "Cash Withdrawal In Branch",
        "transactionCount": 6,
        "firstDate": "2024-06-13",
        "lastDate": "2025-12-15",
        "daysSinceLastTransaction": 48,
        "dateSpanDays": 550,
        "avgInterval": 110,
        "minInterval": 0,
        "maxInterval": 216,
        "minAmount": 50,
        "maxAmount": 21415.99,
        "avgAmount": 3799.331666666667,
        "amountVariance": 62081683.50001389,
        "transactionType": "expense",
        "sampleDates": [
          "2024-06-13",
          "2025-01-15",
          "2025-07-15",
          "2025-07-15",
          "2025-10-24",
          "2025-12-15"
        ],
        "sampleAmounts": [
          400,
          21415.99,
          270,
          50,
          300,
          360
        ]
      },
      {
        "merchantGroupId": 7508,
        "merchantName": "Truist",
        "transactionCount": 6,
        "firstDate": "2024-10-22",
        "lastDate": "2025-03-27",
        "daysSinceLastTransaction": 311,
        "dateSpanDays": 156,
        "avgInterval": 31.2,
        "minInterval": 6,
        "maxInterval": 60,
        "minAmount": 804.76,
        "maxAmount": 33822.04,
        "avgAmount": 6441.766666666666,
        "amountVariance": 150022225.38262224,
        "transactionType": "expense",
        "sampleDates": [
          "2024-10-22",
          "2024-11-27",
          "2024-12-23",
          "2025-02-21",
          "2025-03-21",
          "2025-03-27"
        ],
        "sampleAmounts": [
          804.76,
          1609.52,
          804.76,
          804.76,
          804.76,
          33822.04
        ]
      },
      {
        "merchantGroupId": 7301,
        "merchantName": "Optavia",
        "transactionCount": 6,
        "firstDate": "2025-02-28",
        "lastDate": "2026-01-08",
        "daysSinceLastTransaction": 24,
        "dateSpanDays": 314,
        "avgInterval": 62.8,
        "minInterval": 31,
        "maxInterval": 119,
        "minAmount": 321.5,
        "maxAmount": 433.38,
        "avgAmount": 409.21000000000004,
        "amountVariance": 1685.0434333333326,
        "transactionType": "expense",
        "sampleDates": [
          "2025-02-28",
          "2025-06-07",
          "2025-10-04",
          "2025-11-06",
          "2025-12-07",
          "2026-01-08"
        ],
        "sampleAmounts": [
          321.5,
          400.24,
          433.38,
          433.38,
          433.38,
          433.38
        ]
      },
      {
        "merchantGroupId": 7316,
        "merchantName": "WCG Accounting",
        "transactionCount": 6,
        "firstDate": "2025-06-01",
        "lastDate": "2025-12-01",
        "daysSinceLastTransaction": 62,
        "dateSpanDays": 183,
        "avgInterval": 36.6,
        "minInterval": 30,
        "maxInterval": 61,
        "minAmount": 125,
        "maxAmount": 125,
        "avgAmount": 125,
        "amountVariance": 0,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-01",
          "2025-07-01",
          "2025-08-01",
          "2025-10-01",
          "2025-11-01",
          "2025-12-01"
        ],
        "sampleAmounts": [
          125,
          125,
          125,
          125,
          125,
          125
        ]
      },
      {
        "merchantGroupId": 7484,
        "merchantName": "Hobby Lobby",
        "transactionCount": 6,
        "firstDate": "2025-06-06",
        "lastDate": "2025-12-09",
        "daysSinceLastTransaction": 54,
        "dateSpanDays": 186,
        "avgInterval": 37.2,
        "minInterval": 0,
        "maxInterval": 107,
        "minAmount": 3.29,
        "maxAmount": 39.08,
        "avgAmount": 17.833333333333332,
        "amountVariance": 195.05145555555552,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-06",
          "2025-07-02",
          "2025-07-02",
          "2025-07-28",
          "2025-11-12",
          "2025-12-09"
        ],
        "sampleAmounts": [
          13.22,
          4.27,
          34.44,
          39.08,
          3.29,
          12.7
        ]
      },
      {
        "merchantGroupId": 7319,
        "merchantName": "North Hills Church",
        "transactionCount": 6,
        "firstDate": "2025-06-29",
        "lastDate": "2025-12-02",
        "daysSinceLastTransaction": 61,
        "dateSpanDays": 156,
        "avgInterval": 31.2,
        "minInterval": 7,
        "maxInterval": 66,
        "minAmount": 3,
        "maxAmount": 500,
        "avgAmount": 87.29166666666667,
        "amountVariance": 34066.92534722222,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-29",
          "2025-07-13",
          "2025-09-07",
          "2025-09-14",
          "2025-09-27",
          "2025-12-02"
        ],
        "sampleAmounts": [
          5.5,
          5.75,
          6,
          3,
          3.5,
          500
        ]
      },
      {
        "merchantGroupId": 7415,
        "merchantName": "United",
        "transactionCount": 6,
        "firstDate": "2025-12-02",
        "lastDate": "2025-12-02",
        "daysSinceLastTransaction": 61,
        "dateSpanDays": 0,
        "avgInterval": 0,
        "minInterval": 0,
        "maxInterval": 0,
        "minAmount": 926.03,
        "maxAmount": 926.03,
        "avgAmount": 926.0299999999999,
        "amountVariance": 1.2924697071141057e-26,
        "transactionType": "expense",
        "sampleDates": [
          "2025-12-02",
          "2025-12-02",
          "2025-12-02",
          "2025-12-02",
          "2025-12-02",
          "2025-12-02"
        ],
        "sampleAmounts": [
          926.03,
          926.03,
          926.03,
          926.03,
          926.03,
          926.03
        ]
      },
      {
        "merchantGroupId": 7530,
        "merchantName": "Paygamemoney Estonia",
        "transactionCount": 5,
        "firstDate": "2023-12-27",
        "lastDate": "2024-12-05",
        "daysSinceLastTransaction": 423,
        "dateSpanDays": 344,
        "avgInterval": 86,
        "minInterval": 14,
        "maxInterval": 185,
        "minAmount": 10.69,
        "maxAmount": 52.58,
        "avgAmount": 22.209999999999997,
        "amountVariance": 245.65971999999996,
        "transactionType": "income",
        "sampleDates": [
          "2023-12-27",
          "2024-01-18",
          "2024-05-20",
          "2024-06-03",
          "2024-12-05"
        ],
        "sampleAmounts": [
          52.58,
          21.16,
          10.69,
          15.93,
          10.69
        ]
      },
      {
        "merchantGroupId": 7517,
        "merchantName": "Transfer Ref Ib0s6k63d7 To Signify Business Essent...",
        "transactionCount": 5,
        "firstDate": "2024-04-09",
        "lastDate": "2025-04-28",
        "daysSinceLastTransaction": 279,
        "dateSpanDays": 384,
        "avgInterval": 96,
        "minInterval": 0,
        "maxInterval": 337,
        "minAmount": 9.77,
        "maxAmount": 10101.64,
        "avgAmount": 2106.264,
        "amountVariance": 15990616.501863997,
        "transactionType": "expense",
        "sampleDates": [
          "2024-04-09",
          "2024-04-09",
          "2024-04-30",
          "2025-04-02",
          "2025-04-28"
        ],
        "sampleAmounts": [
          9.77,
          10101.64,
          285.86,
          88.19,
          45.86
        ]
      },
      {
        "merchantGroupId": 7373,
        "merchantName": "The Brand Leader The Brand Leader Paying Bill Via...",
        "transactionCount": 5,
        "firstDate": "2024-07-05",
        "lastDate": "2026-01-23",
        "daysSinceLastTransaction": 9,
        "dateSpanDays": 567,
        "avgInterval": 141.75,
        "minInterval": 14,
        "maxInterval": 291,
        "minAmount": 625,
        "maxAmount": 1275,
        "avgAmount": 970,
        "amountVariance": 76850,
        "transactionType": "income",
        "sampleDates": [
          "2024-07-05",
          "2025-04-22",
          "2025-05-06",
          "2025-07-18",
          "2026-01-23"
        ],
        "sampleAmounts": [
          1275,
          650,
          1100,
          625,
          1200
        ]
      },
      {
        "merchantGroupId": 7538,
        "merchantName": "Transfer To Wadsworth J Ref Ib0ptvj6j6 Everyday Ch...",
        "transactionCount": 5,
        "firstDate": "2024-10-10",
        "lastDate": "2025-11-24",
        "daysSinceLastTransaction": 69,
        "dateSpanDays": 410,
        "avgInterval": 102.5,
        "minInterval": 19,
        "maxInterval": 173,
        "minAmount": 38,
        "maxAmount": 5000,
        "avgAmount": 2427.6,
        "amountVariance": 3582047.04,
        "transactionType": "expense",
        "sampleDates": [
          "2024-10-10",
          "2025-04-01",
          "2025-09-15",
          "2025-11-05",
          "2025-11-24"
        ],
        "sampleAmounts": [
          3500,
          3150,
          450,
          38,
          5000
        ]
      },
      {
        "merchantGroupId": 7363,
        "merchantName": "Food Lion",
        "transactionCount": 5,
        "firstDate": "2025-01-14",
        "lastDate": "2025-12-18",
        "daysSinceLastTransaction": 45,
        "dateSpanDays": 338,
        "avgInterval": 84.5,
        "minInterval": 1,
        "maxInterval": 145,
        "minAmount": 6.99,
        "maxAmount": 31.85,
        "avgAmount": 15.178,
        "amountVariance": 88.626656,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-14",
          "2025-06-08",
          "2025-06-09",
          "2025-10-09",
          "2025-12-18"
        ],
        "sampleAmounts": [
          6.99,
          31.85,
          18.97,
          6.99,
          11.09
        ]
      },
      {
        "merchantGroupId": 7354,
        "merchantName": "Murphy",
        "transactionCount": 5,
        "firstDate": "2025-06-12",
        "lastDate": "2025-09-20",
        "daysSinceLastTransaction": 134,
        "dateSpanDays": 100,
        "avgInterval": 25,
        "minInterval": 1,
        "maxInterval": 64,
        "minAmount": 13.99,
        "maxAmount": 40.33,
        "avgAmount": 33.821999999999996,
        "amountVariance": 99.33397599999998,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-12",
          "2025-07-05",
          "2025-09-07",
          "2025-09-19",
          "2025-09-20"
        ],
        "sampleAmounts": [
          13.99,
          40.33,
          39.34,
          37.94,
          37.51
        ]
      },
      {
        "merchantGroupId": 7326,
        "merchantName": "Disney Plus",
        "transactionCount": 5,
        "firstDate": "2025-06-15",
        "lastDate": "2025-11-20",
        "daysSinceLastTransaction": 73,
        "dateSpanDays": 158,
        "avgInterval": 39.5,
        "minInterval": 30,
        "maxInterval": 67,
        "minAmount": 3.17,
        "maxAmount": 3.2,
        "avgAmount": 3.194,
        "amountVariance": 0.00014400000000000236,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-15",
          "2025-07-15",
          "2025-09-20",
          "2025-10-20",
          "2025-11-20"
        ],
        "sampleAmounts": [
          3.2,
          3.2,
          3.2,
          3.2,
          3.17
        ]
      },
      {
        "merchantGroupId": 7305,
        "merchantName": "Roller Time Family Skate Center Of Easley",
        "transactionCount": 5,
        "firstDate": "2025-09-29",
        "lastDate": "2025-11-18",
        "daysSinceLastTransaction": 75,
        "dateSpanDays": 50,
        "avgInterval": 12.5,
        "minInterval": 7,
        "maxInterval": 22,
        "minAmount": 10.7,
        "maxAmount": 120,
        "avgAmount": 36.839999999999996,
        "amountVariance": 1751.7943999999995,
        "transactionType": "expense",
        "sampleDates": [
          "2025-09-29",
          "2025-10-06",
          "2025-10-13",
          "2025-10-27",
          "2025-11-18"
        ],
        "sampleAmounts": [
          120,
          10.7,
          10.7,
          21.4,
          21.4
        ]
      },
      {
        "merchantGroupId": 7572,
        "merchantName": "Greenville Count Echeck Jonathan Wadsworth",
        "transactionCount": 4,
        "firstDate": "2023-12-13",
        "lastDate": "2025-12-31",
        "daysSinceLastTransaction": 32,
        "dateSpanDays": 749,
        "avgInterval": 249.66666666666666,
        "minInterval": 0,
        "maxInterval": 392,
        "minAmount": 1.5,
        "maxAmount": 9154.74,
        "avgAmount": 6589.244999999999,
        "amountVariance": 14521825.550024997,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-13",
          "2023-12-13",
          "2025-01-08",
          "2025-12-31"
        ],
        "sampleAmounts": [
          1.5,
          8505.75,
          8694.99,
          9154.74
        ]
      },
      {
        "merchantGroupId": 7375,
        "merchantName": "Transfer Ref Ib0v7bklny To Signify Business Essent...",
        "transactionCount": 4,
        "firstDate": "2023-12-29",
        "lastDate": "2025-10-07",
        "daysSinceLastTransaction": 117,
        "dateSpanDays": 648,
        "avgInterval": 216,
        "minInterval": 6,
        "maxInterval": 487,
        "minAmount": 146.35,
        "maxAmount": 5000,
        "avgAmount": 1425.2725,
        "amountVariance": 4268270.314268751,
        "transactionType": "expense",
        "sampleDates": [
          "2023-12-29",
          "2024-01-04",
          "2024-06-07",
          "2025-10-07"
        ],
        "sampleAmounts": [
          5000,
          385.54,
          146.35,
          169.2
        ]
      },
      {
        "merchantGroupId": 7541,
        "merchantName": "Wells Fargo Rewards",
        "transactionCount": 4,
        "firstDate": "2024-01-09",
        "lastDate": "2025-03-19",
        "daysSinceLastTransaction": 319,
        "dateSpanDays": 435,
        "avgInterval": 145,
        "minInterval": 114,
        "maxInterval": 190,
        "minAmount": 19.79,
        "maxAmount": 815.68,
        "avgAmount": 429.6925,
        "amountVariance": 86940.57576874999,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-09",
          "2024-05-02",
          "2024-09-10",
          "2025-03-19"
        ],
        "sampleAmounts": [
          815.68,
          565.08,
          318.22,
          19.79
        ]
      },
      {
        "merchantGroupId": 7324,
        "merchantName": "Chase Card Rewards",
        "transactionCount": 4,
        "firstDate": "2024-01-10",
        "lastDate": "2025-10-14",
        "daysSinceLastTransaction": 110,
        "dateSpanDays": 643,
        "avgInterval": 214.33333333333334,
        "minInterval": 104,
        "maxInterval": 294,
        "minAmount": 96.8,
        "maxAmount": 309.5,
        "avgAmount": 159.8875,
        "amountVariance": 7545.685668749999,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-10",
          "2024-09-11",
          "2024-12-24",
          "2025-10-14"
        ],
        "sampleAmounts": [
          110.48,
          96.8,
          309.5,
          122.77
        ]
      },
      {
        "merchantGroupId": 7430,
        "merchantName": "Transfer Ref Ib0thyqmd3 To Signify Business Essent...",
        "transactionCount": 4,
        "firstDate": "2024-03-05",
        "lastDate": "2025-08-13",
        "daysSinceLastTransaction": 172,
        "dateSpanDays": 526,
        "avgInterval": 175.33333333333334,
        "minInterval": 0,
        "maxInterval": 267,
        "minAmount": 220.68,
        "maxAmount": 15000,
        "avgAmount": 4116.5625,
        "amountVariance": 39580727.35881875,
        "transactionType": "expense",
        "sampleDates": [
          "2024-03-05",
          "2024-03-05",
          "2024-11-27",
          "2025-08-13"
        ],
        "sampleAmounts": [
          998.84,
          15000,
          246.73,
          220.68
        ]
      },
      {
        "merchantGroupId": 7290,
        "merchantName": "Wyze Labs",
        "transactionCount": 4,
        "firstDate": "2024-03-13",
        "lastDate": "2025-08-27",
        "daysSinceLastTransaction": 158,
        "dateSpanDays": 532,
        "avgInterval": 177.33333333333334,
        "minInterval": 99,
        "maxInterval": 266,
        "minAmount": 63.54,
        "maxAmount": 104.94,
        "avgAmount": 92.2,
        "amountVariance": 289.0308,
        "transactionType": "income",
        "sampleDates": [
          "2024-03-13",
          "2024-08-27",
          "2024-12-04",
          "2025-08-27"
        ],
        "sampleAmounts": [
          95.38,
          104.94,
          63.54,
          104.94
        ]
      },
      {
        "merchantGroupId": 7289,
        "merchantName": "Usps",
        "transactionCount": 4,
        "firstDate": "2024-04-05",
        "lastDate": "2025-11-17",
        "daysSinceLastTransaction": 76,
        "dateSpanDays": 591,
        "avgInterval": 197,
        "minInterval": 142,
        "maxInterval": 297,
        "minAmount": 5.8,
        "maxAmount": 105,
        "avgAmount": 36,
        "amountVariance": 1625.66,
        "transactionType": "income",
        "sampleDates": [
          "2024-04-05",
          "2024-09-04",
          "2025-01-24",
          "2025-11-17"
        ],
        "sampleAmounts": [
          10.4,
          5.8,
          22.8,
          105
        ]
      },
      {
        "merchantGroupId": 7412,
        "merchantName": "Proper Insurance",
        "transactionCount": 4,
        "firstDate": "2024-05-20",
        "lastDate": "2025-05-12",
        "daysSinceLastTransaction": 265,
        "dateSpanDays": 357,
        "avgInterval": 119,
        "minInterval": 77,
        "maxInterval": 140,
        "minAmount": 2229,
        "maxAmount": 6502.23,
        "avgAmount": 3860.2574999999997,
        "amountVariance": 2571121.7601187495,
        "transactionType": "expense",
        "sampleDates": [
          "2024-05-20",
          "2024-10-07",
          "2024-12-23",
          "2025-05-12"
        ],
        "sampleAmounts": [
          3097.32,
          6502.23,
          2229,
          3612.48
        ]
      },
      {
        "merchantGroupId": 7529,
        "merchantName": "Transfer Ref Ib0tqdw3f4 To Signify Business Essent...",
        "transactionCount": 4,
        "firstDate": "2024-07-02",
        "lastDate": "2025-09-02",
        "daysSinceLastTransaction": 152,
        "dateSpanDays": 427,
        "avgInterval": 142.33333333333334,
        "minInterval": 31,
        "maxInterval": 327,
        "minAmount": 240.82,
        "maxAmount": 298.79,
        "avgAmount": 258.99,
        "amountVariance": 548.5253500000006,
        "transactionType": "expense",
        "sampleDates": [
          "2024-07-02",
          "2024-08-02",
          "2024-10-10",
          "2025-09-02"
        ],
        "sampleAmounts": [
          243.38,
          252.97,
          298.79,
          240.82
        ]
      },
      {
        "merchantGroupId": 7341,
        "merchantName": "Roots Real Estate",
        "transactionCount": 4,
        "firstDate": "2024-08-01",
        "lastDate": "2025-06-23",
        "daysSinceLastTransaction": 223,
        "dateSpanDays": 326,
        "avgInterval": 108.66666666666667,
        "minInterval": 25,
        "maxInterval": 236,
        "minAmount": 147,
        "maxAmount": 1205,
        "avgAmount": 490.5,
        "amountVariance": 175580.75,
        "transactionType": "expense",
        "sampleDates": [
          "2024-08-01",
          "2025-03-25",
          "2025-05-29",
          "2025-06-23"
        ],
        "sampleAmounts": [
          255,
          1205,
          355,
          147
        ]
      },
      {
        "merchantGroupId": 7391,
        "merchantName": "Target Taylors",
        "transactionCount": 4,
        "firstDate": "2024-08-10",
        "lastDate": "2025-09-09",
        "daysSinceLastTransaction": 145,
        "dateSpanDays": 395,
        "avgInterval": 131.66666666666666,
        "minInterval": 7,
        "maxInterval": 227,
        "minAmount": 36.04,
        "maxAmount": 96.65,
        "avgAmount": 66.55250000000001,
        "amountVariance": 899.3940187500001,
        "transactionType": "income",
        "sampleDates": [
          "2024-08-10",
          "2025-01-18",
          "2025-01-25",
          "2025-09-09"
        ],
        "sampleAmounts": [
          36.04,
          96.65,
          37.09,
          96.43
        ]
      },
      {
        "merchantGroupId": 7527,
        "merchantName": "Transfer Ref Ib0vjhhyr2 To Signify Business Essent...",
        "transactionCount": 4,
        "firstDate": "2024-09-10",
        "lastDate": "2025-12-17",
        "daysSinceLastTransaction": 46,
        "dateSpanDays": 463,
        "avgInterval": 154.33333333333334,
        "minInterval": 30,
        "maxInterval": 389,
        "minAmount": 105.6,
        "maxAmount": 5544.83,
        "avgAmount": 1552.4575,
        "amountVariance": 5318348.70071875,
        "transactionType": "expense",
        "sampleDates": [
          "2024-09-10",
          "2024-10-10",
          "2025-11-03",
          "2025-12-17"
        ],
        "sampleAmounts": [
          303.54,
          5544.83,
          105.6,
          255.86
        ]
      },
      {
        "merchantGroupId": 7482,
        "merchantName": "Five Below",
        "transactionCount": 4,
        "firstDate": "2024-10-03",
        "lastDate": "2025-12-14",
        "daysSinceLastTransaction": 49,
        "dateSpanDays": 437,
        "avgInterval": 145.66666666666666,
        "minInterval": 15,
        "maxInterval": 288,
        "minAmount": 7.42,
        "maxAmount": 39.91,
        "avgAmount": 23.8675,
        "amountVariance": 161.86746874999994,
        "transactionType": "income",
        "sampleDates": [
          "2024-10-03",
          "2025-07-18",
          "2025-11-29",
          "2025-12-14"
        ],
        "sampleAmounts": [
          31.8,
          16.34,
          39.91,
          7.42
        ]
      },
      {
        "merchantGroupId": 7537,
        "merchantName": "Transfer To Wadsworth J Ref Ib0qmwbnnc Everyday Ch...",
        "transactionCount": 4,
        "firstDate": "2024-12-05",
        "lastDate": "2025-09-15",
        "daysSinceLastTransaction": 139,
        "dateSpanDays": 284,
        "avgInterval": 94.66666666666667,
        "minInterval": 13,
        "maxInterval": 243,
        "minAmount": 458,
        "maxAmount": 5000,
        "avgAmount": 2166.745,
        "amountVariance": 3295820.265075,
        "transactionType": "income",
        "sampleDates": [
          "2024-12-05",
          "2024-12-18",
          "2025-08-18",
          "2025-09-15"
        ],
        "sampleAmounts": [
          708.98,
          2500,
          5000,
          458
        ]
      },
      {
        "merchantGroupId": 7336,
        "merchantName": "Monthly Service Fee",
        "transactionCount": 4,
        "firstDate": "2025-01-16",
        "lastDate": "2025-04-15",
        "daysSinceLastTransaction": 292,
        "dateSpanDays": 89,
        "avgInterval": 29.666666666666668,
        "minInterval": 27,
        "maxInterval": 33,
        "minAmount": 10,
        "maxAmount": 10,
        "avgAmount": 10,
        "amountVariance": 0,
        "transactionType": "expense",
        "sampleDates": [
          "2025-01-16",
          "2025-02-18",
          "2025-03-17",
          "2025-04-15"
        ],
        "sampleAmounts": [
          10,
          10,
          10,
          10
        ]
      },
      {
        "merchantGroupId": 7384,
        "merchantName": "Passport Services",
        "transactionCount": 4,
        "firstDate": "2025-04-01",
        "lastDate": "2025-11-25",
        "daysSinceLastTransaction": 68,
        "dateSpanDays": 238,
        "avgInterval": 79.33333333333333,
        "minInterval": 0,
        "maxInterval": 238,
        "minAmount": 100,
        "maxAmount": 160,
        "avgAmount": 115,
        "amountVariance": 675,
        "transactionType": "expense",
        "sampleDates": [
          "2025-04-01",
          "2025-11-25",
          "2025-11-25",
          "2025-11-25"
        ],
        "sampleAmounts": [
          160,
          100,
          100,
          100
        ]
      },
      {
        "merchantGroupId": 7478,
        "merchantName": "Applebees",
        "transactionCount": 4,
        "firstDate": "2025-05-21",
        "lastDate": "2025-07-25",
        "daysSinceLastTransaction": 191,
        "dateSpanDays": 65,
        "avgInterval": 21.666666666666668,
        "minInterval": 1,
        "maxInterval": 54,
        "minAmount": 9.91,
        "maxAmount": 40.96,
        "avgAmount": 23.155,
        "amountVariance": 154.62922500000002,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-21",
          "2025-07-14",
          "2025-07-15",
          "2025-07-25"
        ],
        "sampleAmounts": [
          28.48,
          13.27,
          9.91,
          40.96
        ]
      },
      {
        "merchantGroupId": 7499,
        "merchantName": "Gabriel Bros",
        "transactionCount": 4,
        "firstDate": "2025-05-29",
        "lastDate": "2025-07-02",
        "daysSinceLastTransaction": 214,
        "dateSpanDays": 34,
        "avgInterval": 11.333333333333334,
        "minInterval": 0,
        "maxInterval": 28,
        "minAmount": 8.47,
        "maxAmount": 49.77,
        "avgAmount": 31.767500000000002,
        "amountVariance": 338.10851875000003,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-29",
          "2025-06-04",
          "2025-06-04",
          "2025-07-02"
        ],
        "sampleAmounts": [
          49.77,
          49.77,
          19.06,
          8.47
        ]
      },
      {
        "merchantGroupId": 7507,
        "merchantName": "Green Laundry Lounge",
        "transactionCount": 4,
        "firstDate": "2025-06-14",
        "lastDate": "2025-06-14",
        "daysSinceLastTransaction": 232,
        "dateSpanDays": 0,
        "avgInterval": 0,
        "minInterval": 0,
        "maxInterval": 0,
        "minAmount": 4.25,
        "maxAmount": 20,
        "avgAmount": 12.5625,
        "amountVariance": 31.69921875,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-14",
          "2025-06-14",
          "2025-06-14",
          "2025-06-14"
        ],
        "sampleAmounts": [
          14,
          20,
          4.25,
          12
        ]
      },
      {
        "merchantGroupId": 7488,
        "merchantName": "Regal Hollywood Cinemas",
        "transactionCount": 4,
        "firstDate": "2025-07-22",
        "lastDate": "2025-12-02",
        "daysSinceLastTransaction": 61,
        "dateSpanDays": 133,
        "avgInterval": 44.333333333333336,
        "minInterval": 0,
        "maxInterval": 133,
        "minAmount": 6.76,
        "maxAmount": 52.45,
        "avgAmount": 25.367500000000003,
        "amountVariance": 332.36121875000003,
        "transactionType": "expense",
        "sampleDates": [
          "2025-07-22",
          "2025-07-22",
          "2025-12-02",
          "2025-12-02"
        ],
        "sampleAmounts": [
          52.45,
          10.79,
          31.47,
          6.76
        ]
      },
      {
        "merchantGroupId": 7437,
        "merchantName": "Greenville County",
        "transactionCount": 4,
        "firstDate": "2025-08-27",
        "lastDate": "2025-09-29",
        "daysSinceLastTransaction": 125,
        "dateSpanDays": 33,
        "avgInterval": 11,
        "minInterval": 0,
        "maxInterval": 33,
        "minAmount": 10.64,
        "maxAmount": 687.48,
        "avgAmount": 397.52500000000003,
        "amountVariance": 66318.882475,
        "transactionType": "expense",
        "sampleDates": [
          "2025-08-27",
          "2025-09-29",
          "2025-09-29",
          "2025-09-29"
        ],
        "sampleAmounts": [
          561.8,
          687.48,
          10.64,
          330.18
        ]
      },
      {
        "merchantGroupId": 7551,
        "merchantName": "Tmobile Auto Pay Bellevue Wa",
        "transactionCount": 4,
        "firstDate": "2025-10-17",
        "lastDate": "2026-01-17",
        "daysSinceLastTransaction": 15,
        "dateSpanDays": 92,
        "avgInterval": 30.666666666666668,
        "minInterval": 30,
        "maxInterval": 31,
        "minAmount": 75,
        "maxAmount": 75,
        "avgAmount": 75,
        "amountVariance": 0,
        "transactionType": "expense",
        "sampleDates": [
          "2025-10-17",
          "2025-11-17",
          "2025-12-17",
          "2026-01-17"
        ],
        "sampleAmounts": [
          75,
          75,
          75,
          75
        ]
      },
      {
        "merchantGroupId": 7419,
        "merchantName": "Sttark Gr Payroll 1067",
        "transactionCount": 4,
        "firstDate": "2025-12-26",
        "lastDate": "2026-01-23",
        "daysSinceLastTransaction": 9,
        "dateSpanDays": 28,
        "avgInterval": 9.333333333333334,
        "minInterval": 1,
        "maxInterval": 14,
        "minAmount": 3707.77,
        "maxAmount": 4150.74,
        "avgAmount": 3818.5125000000003,
        "amountVariance": 36791.70391874997,
        "transactionType": "income",
        "sampleDates": [
          "2025-12-26",
          "2026-01-08",
          "2026-01-09",
          "2026-01-23"
        ],
        "sampleAmounts": [
          4150.74,
          3707.77,
          3707.77,
          3707.77
        ]
      },
      {
        "merchantGroupId": 7567,
        "merchantName": "Edeposit In Branch 01 25 24 03 43 57 Pm 2616 Wade...",
        "transactionCount": 3,
        "firstDate": "2024-01-25",
        "lastDate": "2026-01-05",
        "daysSinceLastTransaction": 27,
        "dateSpanDays": 711,
        "avgInterval": 355.5,
        "minInterval": 0,
        "maxInterval": 711,
        "minAmount": 450,
        "maxAmount": 30000,
        "avgAmount": 10316.666666666666,
        "amountVariance": 193717222.22222224,
        "transactionType": "income",
        "sampleDates": [
          "2024-01-25",
          "2026-01-05",
          "2026-01-05"
        ],
        "sampleAmounts": [
          30000,
          450,
          500
        ]
      },
      {
        "merchantGroupId": 7394,
        "merchantName": "Transfer Ref Ib0r8pv96d To Signify Business Essent...",
        "transactionCount": 3,
        "firstDate": "2024-01-29",
        "lastDate": "2025-02-10",
        "daysSinceLastTransaction": 356,
        "dateSpanDays": 378,
        "avgInterval": 189,
        "minInterval": 155,
        "maxInterval": 223,
        "minAmount": 159,
        "maxAmount": 3945.95,
        "avgAmount": 1422.2266666666665,
        "amountVariance": 3184590.973755555,
        "transactionType": "expense",
        "sampleDates": [
          "2024-01-29",
          "2024-07-02",
          "2025-02-10"
        ],
        "sampleAmounts": [
          159,
          3945.95,
          161.73
        ]
      },
      {
        "merchantGroupId": 7395,
        "merchantName": "Wave Sv9t Jonathan Wadsworth",
        "transactionCount": 3,
        "firstDate": "2024-04-03",
        "lastDate": "2024-09-11",
        "daysSinceLastTransaction": 508,
        "dateSpanDays": 161,
        "avgInterval": 80.5,
        "minInterval": 13,
        "maxInterval": 148,
        "minAmount": 57.66,
        "maxAmount": 1382.47,
        "avgAmount": 591.5066666666667,
        "amountVariance": 325574.7461555556,
        "transactionType": "income",
        "sampleDates": [
          "2024-04-03",
          "2024-04-16",
          "2024-09-11"
        ],
        "sampleAmounts": [
          57.66,
          334.39,
          1382.47
        ]
      },
      {
        "merchantGroupId": 7370,
        "merchantName": "Once Upon A Child",
        "transactionCount": 3,
        "firstDate": "2024-05-09",
        "lastDate": "2025-10-30",
        "daysSinceLastTransaction": 94,
        "dateSpanDays": 539,
        "avgInterval": 269.5,
        "minInterval": 134,
        "maxInterval": 405,
        "minAmount": 11.41,
        "maxAmount": 13.04,
        "avgAmount": 12.133333333333333,
        "amountVariance": 0.4596222222222217,
        "transactionType": "income",
        "sampleDates": [
          "2024-05-09",
          "2025-06-18",
          "2025-10-30"
        ],
        "sampleAmounts": [
          13.04,
          11.95,
          11.41
        ]
      },
      {
        "merchantGroupId": 7413,
        "merchantName": "Classic Ace Hardware",
        "transactionCount": 3,
        "firstDate": "2024-06-16",
        "lastDate": "2025-11-30",
        "daysSinceLastTransaction": 63,
        "dateSpanDays": 532,
        "avgInterval": 266,
        "minInterval": 235,
        "maxInterval": 297,
        "minAmount": 14.83,
        "maxAmount": 57.84,
        "avgAmount": 33.906666666666666,
        "amountVariance": 320.10362222222227,
        "transactionType": "income",
        "sampleDates": [
          "2024-06-16",
          "2025-02-06",
          "2025-11-30"
        ],
        "sampleAmounts": [
          57.84,
          14.83,
          29.05
        ]
      },
      {
        "merchantGroupId": 7343,
        "merchantName": "Lismore Park HOA",
        "transactionCount": 3,
        "firstDate": "2024-07-02",
        "lastDate": "2025-07-15",
        "daysSinceLastTransaction": 201,
        "dateSpanDays": 378,
        "avgInterval": 189,
        "minInterval": 0,
        "maxInterval": 378,
        "minAmount": 4.95,
        "maxAmount": 232.31,
        "avgAmount": 155.42,
        "amountVariance": 11322.436466666668,
        "transactionType": "income",
        "sampleDates": [
          "2024-07-02",
          "2025-07-15",
          "2025-07-15"
        ],
        "sampleAmounts": [
          232.31,
          229,
          4.95
        ]
      },
      {
        "merchantGroupId": 7510,
        "merchantName": "Sanders Heating Air Conditioning",
        "transactionCount": 3,
        "firstDate": "2024-09-09",
        "lastDate": "2024-10-11",
        "daysSinceLastTransaction": 478,
        "dateSpanDays": 32,
        "avgInterval": 16,
        "minInterval": 10,
        "maxInterval": 22,
        "minAmount": 178.2,
        "maxAmount": 9347,
        "avgAmount": 6157.400000000001,
        "amountVariance": 17902082.98666667,
        "transactionType": "income",
        "sampleDates": [
          "2024-09-09",
          "2024-10-01",
          "2024-10-11"
        ],
        "sampleAmounts": [
          9347,
          178.2,
          8947
        ]
      },
      {
        "merchantGroupId": 7534,
        "merchantName": "Transfer Ref Ib0q7jt6g8 To Signify Business Essent...",
        "transactionCount": 3,
        "firstDate": "2024-11-12",
        "lastDate": "2024-12-03",
        "daysSinceLastTransaction": 425,
        "dateSpanDays": 21,
        "avgInterval": 10.5,
        "minInterval": 0,
        "maxInterval": 21,
        "minAmount": 128.87,
        "maxAmount": 222.95,
        "avgAmount": 189.73666666666668,
        "amountVariance": 1857.5278222222216,
        "transactionType": "expense",
        "sampleDates": [
          "2024-11-12",
          "2024-11-12",
          "2024-12-03"
        ],
        "sampleAmounts": [
          217.39,
          222.95,
          128.87
        ]
      },
      {
        "merchantGroupId": 7490,
        "merchantName": "Greenville Spartanburg Greer Sc",
        "transactionCount": 3,
        "firstDate": "2024-11-20",
        "lastDate": "2025-12-05",
        "daysSinceLastTransaction": 58,
        "dateSpanDays": 380,
        "avgInterval": 190,
        "minInterval": 158,
        "maxInterval": 222,
        "minAmount": 2,
        "maxAmount": 77.27,
        "avgAmount": 27.09,
        "amountVariance": 1259.0161999999998,
        "transactionType": "income",
        "sampleDates": [
          "2024-11-20",
          "2025-06-30",
          "2025-12-05"
        ],
        "sampleAmounts": [
          2,
          2,
          77.27
        ]
      },
      {
        "merchantGroupId": 7342,
        "merchantName": "Spinx",
        "transactionCount": 3,
        "firstDate": "2024-12-11",
        "lastDate": "2025-05-30",
        "daysSinceLastTransaction": 247,
        "dateSpanDays": 170,
        "avgInterval": 85,
        "minInterval": 32,
        "maxInterval": 138,
        "minAmount": 25,
        "maxAmount": 44.37,
        "avgAmount": 37.796666666666674,
        "amountVariance": 81.89775555555555,
        "transactionType": "income",
        "sampleDates": [
          "2024-12-11",
          "2025-01-12",
          "2025-05-30"
        ],
        "sampleAmounts": [
          44.37,
          25,
          44.02
        ]
      },
      {
        "merchantGroupId": 7433,
        "merchantName": "Cook Out",
        "transactionCount": 3,
        "firstDate": "2025-01-11",
        "lastDate": "2025-06-01",
        "daysSinceLastTransaction": 245,
        "dateSpanDays": 141,
        "avgInterval": 70.5,
        "minInterval": 0,
        "maxInterval": 141,
        "minAmount": 4.95,
        "maxAmount": 46.38,
        "avgAmount": 21.42,
        "amountVariance": 322.11420000000004,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-11",
          "2025-01-11",
          "2025-06-01"
        ],
        "sampleAmounts": [
          46.38,
          4.95,
          12.93
        ]
      },
      {
        "merchantGroupId": 7371,
        "merchantName": "Papa Johns",
        "transactionCount": 3,
        "firstDate": "2025-01-24",
        "lastDate": "2025-12-12",
        "daysSinceLastTransaction": 51,
        "dateSpanDays": 322,
        "avgInterval": 161,
        "minInterval": 19,
        "maxInterval": 303,
        "minAmount": 2.15,
        "maxAmount": 43.18,
        "avgAmount": 23.74666666666667,
        "amountVariance": 282.9168222222222,
        "transactionType": "income",
        "sampleDates": [
          "2025-01-24",
          "2025-11-23",
          "2025-12-12"
        ],
        "sampleAmounts": [
          25.91,
          43.18,
          2.15
        ]
      },
      {
        "merchantGroupId": 7505,
        "merchantName": "Red Robin",
        "transactionCount": 3,
        "firstDate": "2025-02-23",
        "lastDate": "2025-11-21",
        "daysSinceLastTransaction": 72,
        "dateSpanDays": 271,
        "avgInterval": 135.5,
        "minInterval": 123,
        "maxInterval": 148,
        "minAmount": 58.52,
        "maxAmount": 100,
        "avgAmount": 86.15999999999998,
        "amountVariance": 381.98506666666657,
        "transactionType": "income",
        "sampleDates": [
          "2025-02-23",
          "2025-06-26",
          "2025-11-21"
        ],
        "sampleAmounts": [
          99.96,
          100,
          58.52
        ]
      },
      {
        "merchantGroupId": 7519,
        "merchantName": "Irs Usataxpymt Jonathan R Heather A",
        "transactionCount": 3,
        "firstDate": "2025-04-03",
        "lastDate": "2025-06-16",
        "daysSinceLastTransaction": 230,
        "dateSpanDays": 74,
        "avgInterval": 37,
        "minInterval": 12,
        "maxInterval": 62,
        "minAmount": 1900,
        "maxAmount": 6878,
        "avgAmount": 3559.3333333333335,
        "amountVariance": 5506774.222222223,
        "transactionType": "expense",
        "sampleDates": [
          "2025-04-03",
          "2025-04-15",
          "2025-06-16"
        ],
        "sampleAmounts": [
          6878,
          1900,
          1900
        ]
      },
      {
        "merchantGroupId": 7338,
        "merchantName": "Express Tire Engineers",
        "transactionCount": 3,
        "firstDate": "2025-05-30",
        "lastDate": "2025-12-15",
        "daysSinceLastTransaction": 48,
        "dateSpanDays": 199,
        "avgInterval": 99.5,
        "minInterval": 14,
        "maxInterval": 185,
        "minAmount": 56.9,
        "maxAmount": 121.22,
        "avgAmount": 78.33999999999999,
        "amountVariance": 919.3472,
        "transactionType": "expense",
        "sampleDates": [
          "2025-05-30",
          "2025-06-13",
          "2025-12-15"
        ],
        "sampleAmounts": [
          56.9,
          56.9,
          121.22
        ]
      },
      {
        "merchantGroupId": 7486,
        "merchantName": "His Radio",
        "transactionCount": 3,
        "firstDate": "2025-06-01",
        "lastDate": "2025-08-01",
        "daysSinceLastTransaction": 184,
        "dateSpanDays": 61,
        "avgInterval": 30.5,
        "minInterval": 30,
        "maxInterval": 31,
        "minAmount": 84,
        "maxAmount": 84,
        "avgAmount": 84,
        "amountVariance": 0,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-01",
          "2025-07-01",
          "2025-08-01"
        ],
        "sampleAmounts": [
          84,
          84,
          84
        ]
      },
      {
        "merchantGroupId": 7500,
        "merchantName": "Lidl",
        "transactionCount": 3,
        "firstDate": "2025-06-18",
        "lastDate": "2025-12-30",
        "daysSinceLastTransaction": 33,
        "dateSpanDays": 195,
        "avgInterval": 97.5,
        "minInterval": 24,
        "maxInterval": 171,
        "minAmount": 9.9,
        "maxAmount": 276.66,
        "avgAmount": 187.74,
        "amountVariance": 15813.5328,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-18",
          "2025-12-06",
          "2025-12-30"
        ],
        "sampleAmounts": [
          9.9,
          276.66,
          276.66
        ]
      },
      {
        "merchantGroupId": 7309,
        "merchantName": "Bojangles",
        "transactionCount": 3,
        "firstDate": "2025-06-19",
        "lastDate": "2025-09-29",
        "daysSinceLastTransaction": 125,
        "dateSpanDays": 102,
        "avgInterval": 51,
        "minInterval": 6,
        "maxInterval": 96,
        "minAmount": 3.01,
        "maxAmount": 3.01,
        "avgAmount": 3.01,
        "amountVariance": 0,
        "transactionType": "expense",
        "sampleDates": [
          "2025-06-19",
          "2025-06-25",
          "2025-09-29"
        ],
        "sampleAmounts": [
          3.01,
          3.01,
          3.01
        ]
      },
      {
        "merchantGroupId": 7364,
        "merchantName": "Publix",
        "transactionCount": 3,
        "firstDate": "2025-07-12",
        "lastDate": "2026-01-21",
        "daysSinceLastTransaction": 11,
        "dateSpanDays": 193,
        "avgInterval": 96.5,
        "minInterval": 78,
        "maxInterval": 115,
        "minAmount": 2.26,
        "maxAmount": 21.66,
        "avgAmount": 14.853333333333333,
        "amountVariance": 79.46942222222224,
        "transactionType": "expense",
        "sampleDates": [
          "2025-07-12",
          "2025-09-28",
          "2026-01-21"
        ],
        "sampleAmounts": [
          2.26,
          20.64,
          21.66
        ]
      },
      {
        "merchantGroupId": 7295,
        "merchantName": "Hurricane Express Wash",
        "transactionCount": 3,
        "firstDate": "2025-10-08",
        "lastDate": "2025-12-15",
        "daysSinceLastTransaction": 48,
        "dateSpanDays": 68,
        "avgInterval": 34,
        "minInterval": 28,
        "maxInterval": 40,
        "minAmount": 18,
        "maxAmount": 18.54,
        "avgAmount": 18.18,
        "amountVariance": 0.0647999999999998,
        "transactionType": "expense",
        "sampleDates": [
          "2025-10-08",
          "2025-11-05",
          "2025-12-15"
        ],
        "sampleAmounts": [
          18.54,
          18,
          18
        ]
      },
      {
        "merchantGroupId": 7598,
        "merchantName": "Mcdonald S F12644 Mt Juliet Tn",
        "transactionCount": 3,
        "firstDate": "2025-12-18",
        "lastDate": "2025-12-21",
        "daysSinceLastTransaction": 42,
        "dateSpanDays": 3,
        "avgInterval": 1.5,
        "minInterval": 0,
        "maxInterval": 3,
        "minAmount": 1.64,
        "maxAmount": 11.83,
        "avgAmount": 5.583333333333333,
        "amountVariance": 19.95868888888889,
        "transactionType": "expense",
        "sampleDates": [
          "2025-12-18",
          "2025-12-21",
          "2025-12-21"
        ],
        "sampleAmounts": [
          11.83,
          3.28,
          1.64
        ]
      }
    ]
};

// Alternative: Import from a JSON file if you prefer
// import fixtureData from './test-fixture-data.json';
// export const testFixture = fixtureData as TestFixture;

/**
 * Load test fixture from exported JSON
 * Call this with the exported JSON data from the analysis tool
 */
export function loadTestFixture(fixtureData: TestFixture): TestFixture {
  return fixtureData;
}

/**
 * Get transactions that should be detected as recurring
 */
export function getShouldDetectTransactions(fixture: TestFixture): TestTransaction[] {
  const shouldDetectMerchantIds = new Set(
    fixture.analysis
      .filter(a => a.shouldDetect)
      .map(a => a.merchantGroupId)
  );

  return fixture.transactions.filter(
    tx => tx.merchant_group_id && shouldDetectMerchantIds.has(tx.merchant_group_id)
  );
}

/**
 * Get transactions that should NOT be detected as recurring
 */
export function getShouldNotDetectTransactions(fixture: TestFixture): TestTransaction[] {
  const shouldNotDetectMerchantIds = new Set(
    fixture.analysis
      .filter(a => !a.shouldDetect)
      .map(a => a.merchantGroupId)
  );

  return fixture.transactions.filter(
    tx => tx.merchant_group_id && shouldNotDetectMerchantIds.has(tx.merchant_group_id)
  );
}

/**
 * Get transactions for a specific merchant group
 */
export function getTransactionsForMerchant(
  fixture: TestFixture,
  merchantGroupId: number
): TestTransaction[] {
  return fixture.transactions.filter(tx => tx.merchant_group_id === merchantGroupId);
}
