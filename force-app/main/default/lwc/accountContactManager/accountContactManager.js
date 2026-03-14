import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAccountsWithContacts from '@salesforce/apex/AccountContactController.getAccountsWithContacts';
import saveRecords from '@salesforce/apex/AccountContactController.saveRecords';

const INDUSTRY_OPTIONS = [
    { label: '-- None --', value: '' },
    { label: 'Agriculture', value: 'Agriculture' },
    { label: 'Apparel', value: 'Apparel' },
    { label: 'Banking', value: 'Banking' },
    { label: 'Biotechnology', value: 'Biotechnology' },
    { label: 'Chemicals', value: 'Chemicals' },
    { label: 'Communications', value: 'Communications' },
    { label: 'Construction', value: 'Construction' },
    { label: 'Consulting', value: 'Consulting' },
    { label: 'Education', value: 'Education' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Energy', value: 'Energy' },
    { label: 'Engineering', value: 'Engineering' },
    { label: 'Entertainment', value: 'Entertainment' },
    { label: 'Environmental', value: 'Environmental' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Food & Beverage', value: 'Food & Beverage' },
    { label: 'Government', value: 'Government' },
    { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Hospitality', value: 'Hospitality' },
    { label: 'Insurance', value: 'Insurance' },
    { label: 'Machinery', value: 'Machinery' },
    { label: 'Manufacturing', value: 'Manufacturing' },
    { label: 'Media', value: 'Media' },
    { label: 'Not For Profit', value: 'Not For Profit' },
    { label: 'Recreation', value: 'Recreation' },
    { label: 'Retail', value: 'Retail' },
    { label: 'Shipping', value: 'Shipping' },
    { label: 'Technology', value: 'Technology' },
    { label: 'Telecommunications', value: 'Telecommunications' },
    { label: 'Transportation', value: 'Transportation' },
    { label: 'Utilities', value: 'Utilities' },
    { label: 'Other', value: 'Other' }
];

const PAGE_SIZE_OPTIONS = [
    { label: '5 per page', value: '5' },
    { label: '10 per page', value: '10' },
    { label: '20 per page', value: '20' },
    { label: '50 per page', value: '50' }
];

export default class AccountContactManager extends LightningElement {
    @track accounts = [];
    @track isLoading = false;

    currentPage = 1;
    pageSize = 10;
    totalCount = 0;

    // Map of recordId -> { field: draftValue }
    accountDrafts = {};
    contactDrafts = {};

    get industryOptions() {
        return INDUSTRY_OPTIONS;
    }

    get pageSizeOptions() {
        return PAGE_SIZE_OPTIONS;
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    }

    get isPrevDisabled() {
        return this.currentPage <= 1;
    }

    get isNextDisabled() {
        return this.currentPage >= this.totalPages;
    }

    get hasNoDraftChanges() {
        return (
            Object.keys(this.accountDrafts).length === 0 &&
            Object.keys(this.contactDrafts).length === 0
        );
    }

    // Apex sub-query results can come back as {records:[]} or as a direct array
    // depending on how Salesforce serializes Map<String,Object>. This normalises both.
    getContactRecords(contacts) {
        if (!contacts) return [];
        if (Array.isArray(contacts)) return contacts;
        return contacts.records || [];
    }

    get processedAccounts() {
        return this.accounts.map(acc => {
            const draft = this.accountDrafts[acc.Id] || {};
            const isDirty = Object.keys(draft).length > 0;
            const rawRevenue = draft.AnnualRevenue !== undefined ? draft.AnnualRevenue : acc.AnnualRevenue;
            const contactRecords = this.getContactRecords(acc.Contacts);
            return {
                ...acc,
                Name: draft.Name !== undefined ? draft.Name : acc.Name,
                Phone: draft.Phone !== undefined ? draft.Phone : acc.Phone,
                Industry: draft.Industry !== undefined ? draft.Industry : acc.Industry,
                AnnualRevenue: rawRevenue,
                formattedRevenue: rawRevenue != null
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(rawRevenue)
                    : null,
                isEditing: acc._isEditing || false,
                isExpanded: acc._isExpanded || false,
                isDirty,
                expandIcon: acc._isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
                rowClass: isDirty ? 'account-row dirty-row' : 'account-row',
                contactCount: contactRecords.length,
                hasContacts: contactRecords.length > 0,
                contactHeaderKey: acc.Id + '_header',
                noContactKey: acc.Id + '_nocontact',
                contacts: contactRecords.map(con => {
                    const cdraft = this.contactDrafts[con.Id] || {};
                    const isContactDirty = Object.keys(cdraft).length > 0;
                    return {
                        ...con,
                        FirstName: cdraft.FirstName !== undefined ? cdraft.FirstName : con.FirstName,
                        LastName: cdraft.LastName !== undefined ? cdraft.LastName : con.LastName,
                        Email: cdraft.Email !== undefined ? cdraft.Email : con.Email,
                        Phone: cdraft.Phone !== undefined ? cdraft.Phone : con.Phone,
                        Title: cdraft.Title !== undefined ? cdraft.Title : con.Title,
                        isEditing: con._isEditing || false,
                        isDirty: isContactDirty,
                        rowClass: isContactDirty ? 'contact-row dirty-row' : 'contact-row'
                    };
                })
            };
        });
    }

    connectedCallback() {
        this.loadData();
    }

    loadData() {
        this.isLoading = true;
        getAccountsWithContacts({ pageSize: this.pageSize, pageNumber: this.currentPage })
            .then(result => {
                // Preserve UI state (_isEditing, _isExpanded) across reloads
                const existingState = {};
                this.accounts.forEach(a => {
                    existingState[a.Id] = { _isEditing: a._isEditing, _isExpanded: a._isExpanded };
                    this.getContactRecords(a.Contacts).forEach(c => {
                        existingState[c.Id] = { _isEditing: c._isEditing };
                    });
                });

                this.accounts = (result.accounts || []).map(acc => {
                    const state = existingState[acc.Id] || {};
                    const updatedAcc = { ...acc, _isEditing: state._isEditing || false, _isExpanded: state._isExpanded || false };
                    const contactList = this.getContactRecords(acc.Contacts);
                    updatedAcc.Contacts = {
                        records: contactList.map(con => ({
                            ...con,
                            _isEditing: (existingState[con.Id] || {})._isEditing || false
                        }))
                    };
                    return updatedAcc;
                });
                this.totalCount = result.totalCount;
            })
            .catch(error => {
                this.showToast('Error', this.reduceError(error), 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ── Expand / Collapse ────────────────────────────────────────────────────

    handleToggleExpand(event) {
        const recordId = event.currentTarget.dataset.recordId;
        this.accounts = this.accounts.map(acc => {
            if (acc.Id === recordId) {
                return { ...acc, _isExpanded: !acc._isExpanded };
            }
            return acc;
        });
    }

    // ── Inline Edit ──────────────────────────────────────────────────────────

    handleCellClick(event) {
        const recordId = event.currentTarget.dataset.recordId;
        const type = event.currentTarget.dataset.type;
        const accountId = event.currentTarget.dataset.accountId;
        this.startEditing(recordId, type, accountId);
    }

    startEditing(recordId, type, accountId) {
        if (type === 'account') {
            this.accounts = this.accounts.map(acc => {
                if (acc.Id === recordId) {
                    return { ...acc, _isEditing: true };
                }
                return acc;
            });
        } else if (type === 'contact') {
            this.accounts = this.accounts.map(acc => {
                if (acc.Id === accountId) {
                    return {
                        ...acc,
                        Contacts: {
                            records: this.getContactRecords(acc.Contacts).map(con =>
                                con.Id === recordId ? { ...con, _isEditing: true } : con
                            )
                        }
                    };
                }
                return acc;
            });
        }
    }

    handleFieldChange(event) {
        const recordId = event.currentTarget.dataset.recordId;
        const field = event.currentTarget.dataset.field;
        const type = event.currentTarget.dataset.type;
        const value = event.target.value;

        if (type === 'account') {
            this.accountDrafts = {
                ...this.accountDrafts,
                [recordId]: {
                    ...(this.accountDrafts[recordId] || {}),
                    [field]: value
                }
            };
        } else if (type === 'contact') {
            this.contactDrafts = {
                ...this.contactDrafts,
                [recordId]: {
                    ...(this.contactDrafts[recordId] || {}),
                    [field]: value
                }
            };
        }
    }

    // ── Save / Cancel per row ────────────────────────────────────────────────

    handleSaveRow(event) {
        const recordId = event.currentTarget.dataset.recordId;
        const type = event.currentTarget.dataset.type;
        const accountId = event.currentTarget.dataset.accountId;

        const accountsToSave = [];
        const contactsToSave = [];

        if (type === 'account') {
            const draft = this.accountDrafts[recordId];
            if (draft) {
                accountsToSave.push({ Id: recordId, ...draft });
            }
        } else if (type === 'contact') {
            const draft = this.contactDrafts[recordId];
            if (draft) {
                contactsToSave.push({ Id: recordId, ...draft });
            }
        }

        if (accountsToSave.length === 0 && contactsToSave.length === 0) {
            // Nothing changed — just exit edit mode
            this.exitEditMode(recordId, type, accountId);
            return;
        }

        this.isLoading = true;
        saveRecords({ accounts: accountsToSave, contacts: contactsToSave })
            .then(() => {
                this.showToast('Success', 'Record saved successfully.', 'success');
                // Clear draft and exit edit mode
                if (type === 'account') {
                    const updated = { ...this.accountDrafts };
                    delete updated[recordId];
                    this.accountDrafts = updated;
                } else {
                    const updated = { ...this.contactDrafts };
                    delete updated[recordId];
                    this.contactDrafts = updated;
                }
                this.exitEditMode(recordId, type, accountId);
                this.loadData();
            })
            .catch(error => {
                this.showToast('Error', this.reduceError(error), 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleCancelRow(event) {
        const recordId = event.currentTarget.dataset.recordId;
        const type = event.currentTarget.dataset.type;
        const accountId = event.currentTarget.dataset.accountId;

        // Discard draft
        if (type === 'account') {
            const updated = { ...this.accountDrafts };
            delete updated[recordId];
            this.accountDrafts = updated;
        } else {
            const updated = { ...this.contactDrafts };
            delete updated[recordId];
            this.contactDrafts = updated;
        }
        this.exitEditMode(recordId, type, accountId);
    }

    exitEditMode(recordId, type, accountId) {
        if (type === 'account') {
            this.accounts = this.accounts.map(acc =>
                acc.Id === recordId ? { ...acc, _isEditing: false } : acc
            );
        } else if (type === 'contact') {
            this.accounts = this.accounts.map(acc => {
                if (acc.Id === accountId) {
                    return {
                        ...acc,
                        Contacts: {
                            records: this.getContactRecords(acc.Contacts).map(con =>
                                con.Id === recordId ? { ...con, _isEditing: false } : con
                            )
                        }
                    };
                }
                return acc;
            });
        }
    }

    // ── Save All ─────────────────────────────────────────────────────────────

    saveAllChanges() {
        const accountsToSave = Object.entries(this.accountDrafts).map(([id, fields]) => ({
            Id: id,
            ...fields
        }));
        const contactsToSave = Object.entries(this.contactDrafts).map(([id, fields]) => ({
            Id: id,
            ...fields
        }));

        if (accountsToSave.length === 0 && contactsToSave.length === 0) {
            this.showToast('Info', 'No changes to save.', 'info');
            return;
        }

        this.isLoading = true;
        saveRecords({ accounts: accountsToSave, contacts: contactsToSave })
            .then(() => {
                this.showToast('Success', `${accountsToSave.length + contactsToSave.length} record(s) saved.`, 'success');
                this.accountDrafts = {};
                this.contactDrafts = {};
                // Exit all edit modes
                this.accounts = this.accounts.map(acc => ({
                    ...acc,
                    _isEditing: false,
                    Contacts: {
                        records: this.getContactRecords(acc.Contacts).map(con => ({ ...con, _isEditing: false }))
                    }
                }));
                this.loadData();
            })
            .catch(error => {
                this.showToast('Error', this.reduceError(error), 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ── Pagination ───────────────────────────────────────────────────────────

    handlePrev() {
        if (this.currentPage > 1) {
            this.currentPage -= 1;
            this.loadData();
        }
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage += 1;
            this.loadData();
        }
    }

    handlePageSizeChange(event) {
        this.pageSize = parseInt(event.detail.value, 10);
        this.currentPage = 1;
        this.loadData();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    reduceError(error) {
        if (typeof error === 'string') return error;
        if (error.body && error.body.message) return error.body.message;
        if (error.message) return error.message;
        return JSON.stringify(error);
    }
}
