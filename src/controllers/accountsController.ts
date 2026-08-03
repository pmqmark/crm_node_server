import { Request, Response } from "express";
import { AuthRequest } from "../middleware/verifyToken";
import AccountGroup from "../models/accountGroup";
import LedgerAccount from "../models/ledgerAccount";
import Voucher from "../models/voucher";
import mongoose, { Types } from "mongoose";

export class AccountsController {
  private getAccountGroupNature(
    type: "Assets" | "Liabilities" | "Equity" | "Income" | "Expenses",
  ): "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | "EQUITY" {
    const natures = {
      Assets: "ASSET",
      Liabilities: "LIABILITY",
      Equity: "EQUITY",
      Income: "INCOME",
      Expenses: "EXPENSE",
    } as const;

    return natures[type];
  }

  async createAccountGroup(req: Request, res: Response): Promise<Response> {
    try {
      const { name, type, parent_id, description, status } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: "Account group name and type are required",
        });
      }

      const existing = await AccountGroup.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "An account group with that name already exists",
        });
      }

      if (parent_id && !Types.ObjectId.isValid(parent_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent account group ID",
        });
      }

      if (parent_id && !(await AccountGroup.exists({ _id: parent_id }))) {
        return res.status(400).json({
          success: false,
          message: "Parent account group not found",
        });
      }

      const accountGroup = new AccountGroup({
        name: name.trim(),
        type,
        nature: this.getAccountGroupNature(type),
        parent: parent_id ? new Types.ObjectId(parent_id) : undefined,
        description,
        status: status || "Active",
      });

      const savedGroup = await accountGroup.save();
      return res.status(201).json({
        success: true,
        message: "Account group created successfully",
        data: savedGroup,
      });
    } catch (error) {
      console.error("Error creating account group:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating account group",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateAccountGroup(req: Request, res: Response): Promise<Response> {
    try {
      const { account_group_id } = req.params;
      const { name, type, parent_id, description, status } = req.body;

      if (!Types.ObjectId.isValid(account_group_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account group ID",
        });
      }

      const accountGroup = await AccountGroup.findById(account_group_id);
      if (!accountGroup) {
        return res.status(404).json({
          success: false,
          message: "Account group not found",
        });
      }

      if (name) accountGroup.name = name.trim();
      if (type) {
        accountGroup.type = type;
        accountGroup.nature = this.getAccountGroupNature(type);
      }
      if (parent_id !== undefined) {
        if (
          parent_id &&
          (!Types.ObjectId.isValid(parent_id) || parent_id === account_group_id)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid parent account group ID",
          });
        }
        if (parent_id && !(await AccountGroup.exists({ _id: parent_id }))) {
          return res.status(400).json({
            success: false,
            message: "Parent account group not found",
          });
        }
        accountGroup.parent = parent_id
          ? new Types.ObjectId(parent_id)
          : undefined;
      }
      if (description !== undefined) accountGroup.description = description;
      if (status) accountGroup.status = status;

      const updatedGroup = await accountGroup.save();
      return res.status(200).json({
        success: true,
        message: "Account group updated successfully",
        data: updatedGroup,
      });
    } catch (error) {
      console.error("Error updating account group:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating account group",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async deleteAccountGroup(req: Request, res: Response): Promise<Response> {
    try {
      const { account_group_id } = req.params;

      if (!Types.ObjectId.isValid(account_group_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account group ID",
        });
      }

      const linkedLedger = await LedgerAccount.findOne({
        group: new Types.ObjectId(account_group_id),
      });
      if (linkedLedger) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete account group with linked ledger accounts",
        });
      }

      const deletedGroup =
        await AccountGroup.findByIdAndDelete(account_group_id);
      if (!deletedGroup) {
        return res.status(404).json({
          success: false,
          message: "Account group not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Account group deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting account group:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting account group",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async listAccountGroups(req: Request, res: Response): Promise<Response> {
    try {
      const { search, type, status } = req.query;
      const filter: any = {};

      if (search) {
        filter.name = { $regex: new RegExp(search as string, "i") };
      }
      if (type) {
        filter.type = type;
      }
      if (status) {
        filter.status = status;
      }

      const groups = await AccountGroup.find(filter).sort({ name: 1 }).lean();
      return res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      console.error("Error listing account groups:", error);
      return res.status(500).json({
        success: false,
        message: "Error listing account groups",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async createLedgerAccount(req: Request, res: Response): Promise<Response> {
    try {
      const { name, code, group_id, openingBalance, normalBalance } = req.body;

      if (!name || !group_id || !normalBalance) {
        return res.status(400).json({
          success: false,
          message: "Name, group_id and normalBalance are required",
        });
      }

      if (!Types.ObjectId.isValid(group_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account group ID",
        });
      }

      const group = await AccountGroup.findById(group_id);
      if (!group) {
        return res.status(400).json({
          success: false,
          message: "Account group not found",
        });
      }

      const existing = await LedgerAccount.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "A ledger account with that name already exists",
        });
      }

      const ledgerAccount = new LedgerAccount({
        name: name.trim(),
        code,
        group: group._id,
        type:
          group.type === "Expenses"
            ? "Expense"
            : group.type === "Income"
              ? "Income"
              : group.type === "Assets"
                ? "Asset"
                : group.type === "Liabilities"
                  ? "Liability"
                  : "Equity",
        normalBalance,
        openingBalance: openingBalance ? Number(openingBalance) : 0,
      });

      const savedLedger = await ledgerAccount.save();
      return res.status(201).json({
        success: true,
        message: "Ledger account created successfully",
        data: savedLedger,
      });
    } catch (error) {
      console.error("Error creating ledger account:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating ledger account",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateLedgerAccount(req: Request, res: Response): Promise<Response> {
    try {
      const { ledger_account_id } = req.params;
      const { name, code, group_id, openingBalance, normalBalance } = req.body;

      if (!Types.ObjectId.isValid(ledger_account_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ledger account ID",
        });
      }

      const ledgerAccount = await LedgerAccount.findById(ledger_account_id);
      if (!ledgerAccount) {
        return res.status(404).json({
          success: false,
          message: "Ledger account not found",
        });
      }

      if (name) ledgerAccount.name = name.trim();
      if (code !== undefined) ledgerAccount.code = code;
      if (group_id) {
        if (!Types.ObjectId.isValid(group_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid account group ID",
          });
        }

        const group = await AccountGroup.findById(group_id);
        if (!group) {
          return res.status(400).json({
            success: false,
            message: "Account group not found",
          });
        }

        ledgerAccount.group = group._id;
        ledgerAccount.type =
          group.type === "Expenses"
            ? "Expense"
            : group.type === "Income"
              ? "Income"
              : group.type === "Assets"
                ? "Asset"
                : group.type === "Liabilities"
                  ? "Liability"
                  : "Equity";
      }
      if (openingBalance !== undefined) {
        ledgerAccount.openingBalance = Number(openingBalance);
      }
      if (normalBalance) ledgerAccount.normalBalance = normalBalance;

      const updatedLedger = await ledgerAccount.save();
      return res.status(200).json({
        success: true,
        message: "Ledger account updated successfully",
        data: updatedLedger,
      });
    } catch (error) {
      console.error("Error updating ledger account:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating ledger account",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async deleteLedgerAccount(req: Request, res: Response): Promise<Response> {
    try {
      const { ledger_account_id } = req.params;

      if (!Types.ObjectId.isValid(ledger_account_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ledger account ID",
        });
      }

      const linkedEntry = await Voucher.findOne({
        "lines.ledgerAccount": new Types.ObjectId(ledger_account_id),
      });
      if (linkedEntry) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete ledger account that has journal entries",
        });
      }

      const deletedLedger =
        await LedgerAccount.findByIdAndDelete(ledger_account_id);
      if (!deletedLedger) {
        return res.status(404).json({
          success: false,
          message: "Ledger account not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Ledger account deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting ledger account:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting ledger account",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async listLedgerAccounts(req: Request, res: Response): Promise<Response> {
    try {
      const { search, group_id, type } = req.query;
      const filter: any = {};

      if (search) {
        filter.name = { $regex: new RegExp(search as string, "i") };
      }
      if (group_id && Types.ObjectId.isValid(group_id as string)) {
        filter.group = new Types.ObjectId(group_id as string);
      }
      if (type) {
        filter.type = type;
      }

      const ledgers = await LedgerAccount.find(filter)
        .populate("group", "name type")
        .sort({ name: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: ledgers,
      });
    } catch (error) {
      console.error("Error listing ledger accounts:", error);
      return res.status(500).json({
        success: false,
        message: "Error listing ledger accounts",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async createVoucher(req: Request, res: Response): Promise<Response> {
    try {
      const {
        voucherType,
        date,
        branch,
        narration,
        referenceType,
        reference,
        sourceType,
        sourceId,
        lines,
      } = req.body;

      if (!voucherType || !lines || !Array.isArray(lines) || lines.length < 2) {
        return res.status(400).json({
          success: false,
          message: "voucherType and at least two voucher lines are required",
        });
      }

      const authReq = req as AuthRequest;
      const createdById =
        authReq.user?.id && Types.ObjectId.isValid(authReq.user.id)
          ? new Types.ObjectId(authReq.user.id)
          : new Types.ObjectId();

      const voucher = new Voucher({
        voucherType,
        date: date ? new Date(date) : new Date(),
        branch,
        narration,
        referenceType,
        reference,
        sourceType,
        sourceId: sourceId ? new Types.ObjectId(sourceId) : undefined,
        lines: lines.map((line: any) => ({
          ledgerAccount: new Types.ObjectId(line.ledgerAccount),
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          narration: line.narration,
        })),
        createdBy: createdById,
      });

      const savedVoucher = await voucher.save();
      return res.status(201).json({
        success: true,
        message: "Voucher created successfully",
        data: savedVoucher,
      });
    } catch (error) {
      console.error("Error creating voucher:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating voucher",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private calculateAccountNet(account: any, vouchers: Array<any>): number {
    const accountId = (account._id as mongoose.Types.ObjectId).toString();
    const opening =
      account.normalBalance === "Credit"
        ? -account.openingBalance
        : account.openingBalance;
    const lines = vouchers.flatMap((entry) =>
      entry.lines.filter(
        (line: any) =>
          (line.ledgerAccount as mongoose.Types.ObjectId).toString() ===
          accountId,
      ),
    );
    const debit = lines.reduce(
      (sum: number, line: any) => sum + (line.debit || 0),
      0,
    );
    const credit = lines.reduce(
      (sum: number, line: any) => sum + (line.credit || 0),
      0,
    );
    return opening + debit - credit;
  }

  async closeAccountingPeriod(req: Request, res: Response): Promise<Response> {
    try {
      const {
        fromDate,
        toDate,
        equity_account_id,
        reference,
        branch,
        narration,
      } = req.body;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          message: "fromDate and toDate are required to close a period",
        });
      }

      const equityAccount = equity_account_id
        ? await LedgerAccount.findById(equity_account_id)
        : await LedgerAccount.findOne({
            name: { $regex: /Owner Capital/i },
            type: "Equity",
          });

      if (!equityAccount) {
        return res.status(400).json({
          success: false,
          message:
            "Equity account not found. Provide equity_account_id or create Owner Capital account.",
        });
      }

      const voucherFilter: any = { status: "ACTIVE" };
      voucherFilter.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };

      const vouchers = await Voucher.find(voucherFilter).lean();
      const accounts = await LedgerAccount.find({
        type: { $in: ["Income", "Expense"] },
      }).lean();

      const incomeAccounts = accounts.filter(
        (account) => account.type === "Income",
      );
      const expenseAccounts = accounts.filter(
        (account) => account.type === "Expense",
      );

      const incomeLines = incomeAccounts
        .map((account) => {
          const amount = -this.calculateAccountNet(account, vouchers);
          return amount > 0
            ? {
                ledgerAccount: new Types.ObjectId(
                  account._id as mongoose.Types.ObjectId,
                ),
                debit: amount,
                credit: 0,
                narration: `Closing income account ${account.name}`,
              }
            : null;
        })
        .filter(Boolean) as Array<any>;

      const expenseLines = expenseAccounts
        .map((account) => {
          const amount = this.calculateAccountNet(account, vouchers);
          return amount > 0
            ? {
                ledgerAccount: new Types.ObjectId(
                  account._id as mongoose.Types.ObjectId,
                ),
                debit: 0,
                credit: amount,
                narration: `Closing expense account ${account.name}`,
              }
            : null;
        })
        .filter(Boolean) as Array<any>;

      const totalIncome = incomeLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalExpenses = expenseLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );
      const netProfit = totalIncome - totalExpenses;

      if (totalIncome === 0 && totalExpenses === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No income or expense balances found for the selected period",
        });
      }

      const equityLine =
        netProfit >= 0
          ? {
              ledgerAccount: equityAccount._id,
              debit: 0,
              credit: netProfit,
              narration: `Closing profit to equity`,
            }
          : {
              ledgerAccount: equityAccount._id,
              debit: -netProfit,
              credit: 0,
              narration: `Closing loss to equity`,
            };

      const closingLines = [...incomeLines, ...expenseLines, equityLine];

      const authReq = req as AuthRequest;
      const createdById =
        authReq.user?.id && Types.ObjectId.isValid(authReq.user.id)
          ? new Types.ObjectId(authReq.user.id)
          : new Types.ObjectId();

      const closingVoucher = new Voucher({
        voucherType: "JOURNAL",
        date: new Date(toDate),
        branch,
        narration:
          narration || `Closing entry for period ${fromDate} to ${toDate}`,
        referenceType: "period_close",
        reference: reference || `Closing ${fromDate} to ${toDate}`,
        sourceType: "period_close",
        lines: closingLines,
        createdBy: createdById,
      });

      const savedClosingVoucher = await closingVoucher.save();

      return res.status(201).json({
        success: true,
        message: "Period closing voucher created successfully",
        data: savedClosingVoucher,
      });
    } catch (error) {
      console.error("Error closing accounting period:", error);
      return res.status(500).json({
        success: false,
        message: "Error closing accounting period",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async listVouchers(req: Request, res: Response): Promise<Response> {
    try {
      const { voucherType, referenceType, reference, fromDate, toDate } =
        req.query;
      const filter: any = {};

      if (voucherType) filter.voucherType = voucherType;
      if (referenceType) filter.referenceType = referenceType;
      if (reference)
        filter.reference = { $regex: new RegExp(reference as string, "i") };
      if (fromDate || toDate) {
        filter.date = {};
        if (fromDate) filter.date.$gte = new Date(fromDate as string);
        if (toDate) filter.date.$lte = new Date(toDate as string);
      }

      const vouchers = await Voucher.find(filter)
        .populate("lines.ledgerAccount", "name type")
        .sort({ date: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: vouchers,
      });
    } catch (error) {
      console.error("Error listing vouchers:", error);
      return res.status(500).json({
        success: false,
        message: "Error listing vouchers",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getVoucherById(req: Request, res: Response): Promise<Response> {
    try {
      const { voucher_id } = req.params;

      if (!Types.ObjectId.isValid(voucher_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid voucher ID",
        });
      }

      const voucher = (await Voucher.findById(voucher_id)
        .populate({
          path: "lines.ledgerAccount",
          select:
            "code name type normalBalance openingBalance description group",
          populate: {
            path: "group",
            select: "name type nature parent",
            populate: {
              path: "parent",
              select: "name type nature",
            },
          },
        })
        .populate("createdBy", "username email")
        .lean()) as any;

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: "Voucher not found",
        });
      }

      const totalDebit = voucher.lines.reduce(
        (sum: number, line: any) => sum + Number(line.debit || 0),
        0,
      );
      const totalCredit = voucher.lines.reduce(
        (sum: number, line: any) => sum + Number(line.credit || 0),
        0,
      );

      return res.status(200).json({
        success: true,
        data: {
          ...voucher,
          totals: {
            totalDebit,
            totalCredit,
            difference: totalDebit - totalCredit,
            isBalanced: Math.abs(totalDebit - totalCredit) <= 0.01,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving voucher:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving voucher",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateVoucher(req: Request, res: Response): Promise<Response> {
    try {
      const { voucher_id } = req.params;
      const {
        date,
        branch,
        narration,
        referenceType,
        reference,
        sourceType,
        sourceId,
        lines,
        status,
      } = req.body;

      if (!Types.ObjectId.isValid(voucher_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid voucher ID",
        });
      }

      const voucher = await Voucher.findById(voucher_id);
      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: "Voucher not found",
        });
      }

      if (date) voucher.date = new Date(date);
      if (branch !== undefined) voucher.branch = branch;
      if (narration !== undefined) voucher.narration = narration;
      if (referenceType !== undefined) voucher.referenceType = referenceType;
      if (reference !== undefined) voucher.reference = reference;
      if (sourceType !== undefined) voucher.sourceType = sourceType;
      if (sourceId !== undefined)
        voucher.sourceId = new Types.ObjectId(sourceId);
      if (status) voucher.status = status;
      if (lines && Array.isArray(lines) && lines.length >= 2) {
        voucher.lines = lines.map((line: any) => ({
          ledgerAccount: new Types.ObjectId(line.ledgerAccount),
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          narration: line.narration,
        }));
      }

      const updatedVoucher = await voucher.save();
      return res.status(200).json({
        success: true,
        message: "Voucher updated successfully",
        data: updatedVoucher,
      });
    } catch (error) {
      console.error("Error updating voucher:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating voucher",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async deleteVoucher(req: Request, res: Response): Promise<Response> {
    try {
      const { voucher_id } = req.params;
      if (!Types.ObjectId.isValid(voucher_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid voucher ID",
        });
      }

      const deletedVoucher = await Voucher.findByIdAndDelete(voucher_id);
      if (!deletedVoucher) {
        return res.status(404).json({
          success: false,
          message: "Voucher not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Voucher deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting voucher:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting voucher",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getTrialBalance(req: Request, res: Response): Promise<Response> {
    try {
      const { fromDate, toDate } = req.query;
      const accounts = await LedgerAccount.find()
        .populate("group", "name type")
        .lean();
      const voucherFilter: any = { status: "ACTIVE" };
      if (fromDate || toDate) {
        voucherFilter.date = {};
        if (fromDate) voucherFilter.date.$gte = new Date(fromDate as string);
        if (toDate) voucherFilter.date.$lte = new Date(toDate as string);
      }
      const vouchers = await Voucher.find(voucherFilter).lean();

      const balances = accounts.map((account) => {
        const accountId = (account._id as mongoose.Types.ObjectId).toString();
        const opening =
          account.normalBalance === "Credit"
            ? -account.openingBalance
            : account.openingBalance;
        const journalLines = vouchers.flatMap((entry) =>
          entry.lines.filter(
            (line: any) =>
              (line.ledgerAccount as mongoose.Types.ObjectId).toString() ===
              accountId,
          ),
        );
        const totalDebit = journalLines.reduce(
          (sum: number, line: any) => sum + (line.debit || 0),
          0,
        );
        const totalCredit = journalLines.reduce(
          (sum: number, line: any) => sum + (line.credit || 0),
          0,
        );
        const net = opening + totalDebit - totalCredit;
        const debitBalance = net >= 0 ? net : 0;
        const creditBalance = net < 0 ? -net : 0;

        return {
          account_id: account._id,
          name: account.name,
          type: account.type,
          group: account.group,
          debitBalance,
          creditBalance,
        };
      });

      const activeBalances = balances.filter(
        (item) => item.debitBalance !== 0 || item.creditBalance !== 0,
      );
      const totalDebit = activeBalances.reduce(
        (sum, item) => sum + item.debitBalance,
        0,
      );
      const totalCredit = activeBalances.reduce(
        (sum, item) => sum + item.creditBalance,
        0,
      );

      return res.status(200).json({
        success: true,
        summary: {
          totalDebit,
          totalCredit,
        },
        data: activeBalances,
      });
    } catch (error) {
      console.error("Error generating trial balance:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating trial balance",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getLedgerReport(req: Request, res: Response): Promise<Response> {
    try {
      const { ledger_account_id, fromDate, toDate } = req.query;

      if (
        !ledger_account_id ||
        !Types.ObjectId.isValid(ledger_account_id as string)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid ledger_account_id is required",
        });
      }

      const account = await LedgerAccount.findById(ledger_account_id).populate(
        "group",
        "name type",
      );
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Ledger account not found",
        });
      }

      const dateFilter: any = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate as string);
      if (toDate) dateFilter.$lte = new Date(toDate as string);

      const query: any = {
        "lines.ledgerAccount": account._id,
        status: "ACTIVE",
      };
      if (fromDate || toDate) {
        query.date = dateFilter;
      }

      const vouchers = await Voucher.find(query).sort({ date: 1 }).lean();

      const accountId = (account._id as mongoose.Types.ObjectId).toString();
      let runningBalance =
        account.normalBalance === "Credit"
          ? -account.openingBalance
          : account.openingBalance;
      const items = vouchers.map((entry) => {
        const line = entry.lines.find(
          (lineItem: any) =>
            (lineItem.ledgerAccount as mongoose.Types.ObjectId).toString() ===
            accountId,
        );
        runningBalance += (line?.debit || 0) - (line?.credit || 0);
        return {
          entry_id: entry._id,
          voucher_no: entry.voucher_no,
          voucherType: entry.voucherType,
          entryDate: entry.date,
          reference: entry.reference,
          description: entry.description,
          debit: line?.debit || 0,
          credit: line?.credit || 0,
          runningBalance,
          sourceType: entry.sourceType,
          sourceId: entry.sourceId,
        };
      });

      return res.status(200).json({
        success: true,
        account,
        data: items,
      });
    } catch (error) {
      console.error("Error generating ledger report:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating ledger report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getProfitAndLoss(req: Request, res: Response): Promise<Response> {
    try {
      const { fromDate, toDate } = req.query;
      const accounts = await LedgerAccount.find({
        type: { $in: ["Income", "Expense"] },
      })
        .populate("group", "name type")
        .lean();
      const voucherFilter: any = { status: "ACTIVE" };
      if (fromDate || toDate) {
        voucherFilter.date = {};
        if (fromDate) voucherFilter.date.$gte = new Date(fromDate as string);
        if (toDate) voucherFilter.date.$lte = new Date(toDate as string);
      }
      const vouchers = await Voucher.find(voucherFilter).lean();

      const incomeAccounts = accounts.filter(
        (account) => account.type === "Income",
      );
      const expenseAccounts = accounts.filter(
        (account) => account.type === "Expense",
      );

      const getNet = (account: (typeof accounts)[number]) => {
        const accountId = (account._id as mongoose.Types.ObjectId).toString();
        const opening =
          account.normalBalance === "Credit"
            ? -account.openingBalance
            : account.openingBalance;
        const lines = vouchers.flatMap((entry) =>
          entry.lines.filter(
            (line: any) =>
              (line.ledgerAccount as mongoose.Types.ObjectId).toString() ===
              accountId,
          ),
        );
        const debit = lines.reduce(
          (sum: number, line: any) => sum + (line.debit || 0),
          0,
        );
        const credit = lines.reduce(
          (sum: number, line: any) => sum + (line.credit || 0),
          0,
        );
        return opening + debit - credit;
      };

      const income = incomeAccounts.map((account) => ({
        account_id: account._id,
        name: account.name,
        amount: -getNet(account),
      }));

      const expenses = expenseAccounts.map((account) => ({
        account_id: account._id,
        name: account.name,
        amount: getNet(account),
      }));

      const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenses.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const netProfit = totalIncome - totalExpenses;

      return res.status(200).json({
        success: true,
        summary: {
          totalIncome,
          totalExpenses,
          netProfit,
        },
        income,
        expenses,
      });
    } catch (error) {
      console.error("Error generating profit and loss:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating profit and loss",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getBalanceSheet(req: Request, res: Response): Promise<Response> {
    try {
      const { fromDate, toDate } = req.query;
      const accounts = await LedgerAccount.find({
        type: { $in: ["Asset", "Liability", "Equity"] },
      })
        .populate("group", "name type")
        .lean();
      const voucherFilter: any = { status: "ACTIVE" };
      if (fromDate || toDate) {
        voucherFilter.date = {};
        if (fromDate) voucherFilter.date.$gte = new Date(fromDate as string);
        if (toDate) voucherFilter.date.$lte = new Date(toDate as string);
      }
      const vouchers = await Voucher.find(voucherFilter).lean();

      const getNet = (account: (typeof accounts)[number]) => {
        const accountId = (account._id as mongoose.Types.ObjectId).toString();
        const opening =
          account.normalBalance === "Credit"
            ? -account.openingBalance
            : account.openingBalance;
        const lines = vouchers.flatMap((entry) =>
          entry.lines.filter(
            (line: any) =>
              (line.ledgerAccount as mongoose.Types.ObjectId).toString() ===
              accountId,
          ),
        );
        const debit = lines.reduce(
          (sum: number, line: any) => sum + (line.debit || 0),
          0,
        );
        const credit = lines.reduce(
          (sum: number, line: any) => sum + (line.credit || 0),
          0,
        );
        const raw = opening + debit - credit;
        return account.normalBalance === "Credit" ? -raw : raw;
      };

      const assets = accounts
        .filter((account) => account.type === "Asset")
        .map((account) => ({
          account_id: account._id,
          name: account.name,
          balance: getNet(account),
        }));
      const liabilities = accounts
        .filter((account) => account.type === "Liability")
        .map((account) => ({
          account_id: account._id,
          name: account.name,
          balance: getNet(account),
        }));
      const equity = accounts
        .filter((account) => account.type === "Equity")
        .map((account) => ({
          account_id: account._id,
          name: account.name,
          balance: getNet(account),
        }));

      const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0);
      const totalLiabilities = liabilities.reduce(
        (sum, item) => sum + item.balance,
        0,
      );
      const totalEquity = equity.reduce((sum, item) => sum + item.balance, 0);

      return res.status(200).json({
        success: true,
        summary: {
          totalAssets,
          totalLiabilities,
          totalEquity,
        },
        assets,
        liabilities,
        equity,
      });
    } catch (error) {
      console.error("Error generating balance sheet:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating balance sheet",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
