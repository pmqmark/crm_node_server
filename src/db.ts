import mongoose from "mongoose";
import AccountGroup from "./models/accountGroup";
import LedgerAccount from "./models/ledgerAccount";

const defaultAccountGroups = [
  {
    name: "Assets",
    type: "Assets",
    nature: "ASSET",
    description: "Primary asset accounts",
  },
  {
    name: "Current Assets",
    type: "Assets",
    parent: "Assets",
    nature: "ASSET",
    description: "Short-term assets",
  },
  {
    name: "Fixed Assets",
    type: "Assets",
    parent: "Assets",
    nature: "ASSET",
    description: "Long-term fixed assets",
  },
  {
    name: "Liabilities",
    type: "Liabilities",
    nature: "LIABILITY",
    description: "Primary liability accounts",
  },
  {
    name: "Current Liabilities",
    type: "Liabilities",
    parent: "Liabilities",
    nature: "LIABILITY",
    description: "Short-term liabilities",
  },
  {
    name: "Income",
    type: "Income",
    nature: "INCOME",
    description: "Primary income accounts",
  },
  {
    name: "Direct Income",
    type: "Income",
    parent: "Income",
    nature: "INCOME",
    description: "Income from core operations",
  },
  {
    name: "Expenses",
    type: "Expenses",
    nature: "EXPENSE",
    description: "Primary expense accounts",
  },
  {
    name: "Direct Expenses",
    type: "Expenses",
    parent: "Expenses",
    nature: "EXPENSE",
    description: "Direct operating expenses",
  },
  {
    name: "Indirect Expenses",
    type: "Expenses",
    parent: "Expenses",
    nature: "EXPENSE",
    description: "Indirect operating expenses",
  },
  {
    name: "Equity",
    type: "Equity",
    nature: "EQUITY",
    description: "Owner equity accounts",
  },
];

const defaultLedgerAccounts = [
  {
    code: "1001",
    name: "Cash",
    group: "Current Assets",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Cash in hand",
  },
  {
    code: "1002",
    name: "Bank Account",
    group: "Current Assets",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Primary bank account",
  },
  {
    code: "1003",
    name: "Accounts Receivable",
    group: "Current Assets",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Trade debtors owed by customers",
  },
  {
    code: "1004",
    name: "Inventory",
    group: "Current Assets",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Stock-in-hand value",
  },
  {
    code: "1005",
    name: "UPI Receivable",
    group: "Current Assets",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "UPI payments receivable",
  },
  {
    code: "1006",
    name: "Card Receivable",
    group: "Current Assets",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Card payments receivable",
  },
  {
    code: "2001",
    name: "Accounts Payable",
    group: "Current Liabilities",
    normalBalance: "Credit",
    openingBalance: 0,
    description: "Trade creditors owed to suppliers",
  },
  {
    code: "3001",
    name: "Owner Capital",
    group: "Equity",
    normalBalance: "Credit",
    openingBalance: 0,
    description: "Owner capital / equity",
  },
  {
    code: "4001",
    name: "Sales Revenue",
    group: "Direct Income",
    normalBalance: "Credit",
    openingBalance: 0,
    description: "Revenue from sales",
  },
  {
    code: "2002",
    name: "GST Payable",
    group: "Current Liabilities",
    normalBalance: "Credit",
    openingBalance: 0,
    description: "Output GST collected on sales",
  },
  {
    code: "2003",
    name: "GST Receivable",
    group: "Current Liabilities",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Input tax credit on purchases",
  },
  {
    code: "5001",
    name: "Cost of Goods Sold",
    group: "Direct Expenses",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Cost of goods sold",
  },
  {
    code: "5002",
    name: "Purchase Expense",
    group: "Direct Expenses",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Purchase costs",
  },
  {
    code: "5101",
    name: "Discount Allowed",
    group: "Indirect Expenses",
    normalBalance: "Debit",
    openingBalance: 0,
    description: "Discounts given to customers",
  },
  {
    code: "5102",
    name: "Discount Received",
    group: "Indirect Expenses",
    normalBalance: "Credit",
    openingBalance: 0,
    description: "Discounts received from suppliers",
  },
];

const seedDefaultAccounts = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.warn(
        "Database connection not ready for seeding default accounts",
      );
      return;
    }

    const existingCollections = await db.listCollections().toArray();
    const existingNames = new Set(
      existingCollections.map((col: any) => col.name),
    );
    const desiredCollections = ["accountgroups", "ledgeraccounts"];
    const missingCollections = desiredCollections.filter(
      (name) => !existingNames.has(name),
    );

    if (existingCollections.length + missingCollections.length > 500) {
      console.warn(
        "Skipping default account seed because creating missing collections would exceed the MongoDB collection limit.",
      );
      return;
    }

    const groupMap: Record<string, mongoose.Types.ObjectId> = {};

    for (const groupData of defaultAccountGroups) {
      const existingGroup = (await AccountGroup.findOne({
        name: groupData.name,
      }).lean()) as { _id: mongoose.Types.ObjectId } | null;
      if (existingGroup) {
        await AccountGroup.updateOne(
          { _id: existingGroup._id },
          {
            $set: {
              type: groupData.type,
              nature: groupData.nature,
              description: groupData.description,
              parent: groupData.parent ? groupMap[groupData.parent] : undefined,
            },
          },
        );
        groupMap[groupData.name] = existingGroup._id;
        continue;
      }

      const group = new AccountGroup({
        name: groupData.name,
        type: groupData.type,
        nature: groupData.nature,
        parent: groupData.parent ? groupMap[groupData.parent] : undefined,
        description: groupData.description,
        status: "Active",
      });
      try {
        await group.save();
        groupMap[groupData.name] = group._id;
      } catch (error: any) {
        if (error?.code === 8000) {
          console.warn(
            "Skipping default account seed because creating the account group collection would exceed the MongoDB collection limit.",
          );
          return;
        }
        throw error;
      }
    }

    for (const accountData of defaultLedgerAccounts) {
      const existingLedger = await LedgerAccount.findOne({
        name: accountData.name,
      });
      const groupId = groupMap[accountData.group];
      if (!groupId) continue;

      const ledgerType = accountData.group.includes("Expense")
        ? "Expense"
        : accountData.group.includes("Income")
          ? "Income"
          : accountData.group.includes("Assets")
            ? "Asset"
            : accountData.group.includes("Liabilities")
              ? "Liability"
              : "Equity";

      if (existingLedger) {
        await LedgerAccount.updateOne(
          { _id: existingLedger._id },
          {
            $set: {
              code: accountData.code,
              group: groupId,
              type: ledgerType,
              normalBalance: accountData.normalBalance,
              description: accountData.description,
              isSystem: true,
            },
          },
        );
        continue;
      }

      const ledgerAccount = new LedgerAccount({
        name: accountData.name,
        code: accountData.code,
        group: groupId,
        type: ledgerType,
        normalBalance: accountData.normalBalance,
        openingBalance: accountData.openingBalance,
        description: accountData.description,
        isSystem: true,
      });
      try {
        await ledgerAccount.save();
      } catch (error: any) {
        if (error?.code === 8000) {
          console.warn(
            "Skipping default ledger seed because creating the ledger account collection would exceed the MongoDB collection limit.",
          );
          return;
        }
        throw error;
      }
    }

    console.log("Default account groups and ledger accounts seeded");
  } catch (error) {
    console.error("Error seeding default accounts:", error);
  }
};

export const connect = (): void => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment configuration");
  }

  mongoose
    .connect(process.env.DATABASE_URL, {
      autoCreate: false,
      autoIndex: false,
    })
    .then(async () => {
      console.log("Database connected");
      await seedDefaultAccounts();
    })
    .catch((err) => {
      console.error("Database connection error:", err);
    });
};
