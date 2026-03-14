@isTest
private class AccountContactControllerTest {

    // ── Test Data Setup ──────────────────────────────────────────────────────

    @TestSetup
    static void setupTestData() {
        List<Account> accounts = new List<Account>();
        for (Integer i = 1; i <= 15; i++) {
            accounts.add(new Account(
                Name          = 'Test Account ' + String.valueOf(i).leftPad(2, '0'),
                Phone         = '555-000-' + String.valueOf(i).leftPad(4, '0'),
                Industry      = 'Technology',
                AnnualRevenue = i * 100000,
                Type          = 'Prospect'
            ));
        }
        insert accounts;

        List<Contact> contacts = new List<Contact>();
        for (Integer i = 0; i < 5; i++) {
            contacts.add(new Contact(
                FirstName  = 'First'  + i,
                LastName   = 'Last'   + i,
                Email      = 'test'   + i + '@testorg.com',
                Phone      = '555-100-' + String.valueOf(i).leftPad(4, '0'),
                Title      = 'Developer',
                Department = 'Technology',
                AccountId  = accounts[i].Id
            ));
        }
        insert contacts;
    }

    // ── getAccountsWithContacts ──────────────────────────────────────────────

    @isTest
    static void testGetAccountsFirstPage() {
        Test.startTest();
        Map<String, Object> result = AccountContactController.getAccountsWithContacts(10, 1);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Result map should not be null');

        List<Account> accounts  = (List<Account>) result.get('accounts');
        Integer       totalCount = (Integer)       result.get('totalCount');

        System.assertEquals(10, accounts.size(),  'Page 1 should return 10 accounts');
        System.assertEquals(15, totalCount,       'Total count should be 15');
    }

    @isTest
    static void testGetAccountsSecondPage() {
        Test.startTest();
        Map<String, Object> result = AccountContactController.getAccountsWithContacts(10, 2);
        Test.stopTest();

        List<Account> accounts = (List<Account>) result.get('accounts');
        System.assertEquals(5, accounts.size(), 'Page 2 should return remaining 5 accounts');
    }

    @isTest
    static void testGetAccountsSmallPageSize() {
        Test.startTest();
        Map<String, Object> result = AccountContactController.getAccountsWithContacts(5, 1);
        Test.stopTest();

        List<Account> accounts   = (List<Account>) result.get('accounts');
        Integer       totalCount = (Integer)       result.get('totalCount');

        System.assertEquals(5,  accounts.size(), 'Should return 5 accounts for page size 5');
        System.assertEquals(15, totalCount,      'Total count should still be 15 regardless of page size');
    }

    @isTest
    static void testGetAccountsIncludesRelatedContacts() {
        Test.startTest();
        Map<String, Object> result = AccountContactController.getAccountsWithContacts(15, 1);
        Test.stopTest();

        List<Account> accounts = (List<Account>) result.get('accounts');

        Integer contactCount = 0;
        for (Account acc : accounts) {
            if (acc.Contacts != null) {
                contactCount += acc.Contacts.size();
            }
        }
        System.assertEquals(5, contactCount, 'Should return 5 contacts across all accounts');
    }

    @isTest
    static void testGetAccountsResultMapKeys() {
        Test.startTest();
        Map<String, Object> result = AccountContactController.getAccountsWithContacts(10, 1);
        Test.stopTest();

        System.assert(result.containsKey('accounts'),   'Result should contain "accounts" key');
        System.assert(result.containsKey('totalCount'), 'Result should contain "totalCount" key');
    }

    @isTest
    static void testGetAccountsBeyondLastPage() {
        // Requesting a page number past the data — should return empty list, not error
        Test.startTest();
        Map<String, Object> result = AccountContactController.getAccountsWithContacts(10, 99);
        Test.stopTest();

        List<Account> accounts = (List<Account>) result.get('accounts');
        System.assertEquals(0, accounts.size(), 'Page 99 should return 0 accounts');
    }

    // ── saveRecords ──────────────────────────────────────────────────────────

    @isTest
    static void testSaveAccountFields() {
        Account acc = [SELECT Id, Name, Industry FROM Account WHERE Name = 'Test Account 01' LIMIT 1];
        acc.Name     = 'Updated Account Name';
        acc.Industry = 'Finance';

        Test.startTest();
        AccountContactController.saveRecords(new List<Account>{ acc }, null);
        Test.stopTest();

        Account updated = [SELECT Name, Industry FROM Account WHERE Id = :acc.Id];
        System.assertEquals('Updated Account Name', updated.Name,     'Account name should be updated');
        System.assertEquals('Finance',              updated.Industry, 'Account industry should be updated');
    }

    @isTest
    static void testSaveAccountPhone() {
        Account acc = [SELECT Id, Phone FROM Account WHERE Name = 'Test Account 01' LIMIT 1];
        acc.Phone = '999-888-7777';

        Test.startTest();
        AccountContactController.saveRecords(new List<Account>{ acc }, null);
        Test.stopTest();

        Account updated = [SELECT Phone FROM Account WHERE Id = :acc.Id];
        System.assertEquals('999-888-7777', updated.Phone, 'Account phone should be updated');
    }

    @isTest
    static void testSaveAccountAnnualRevenue() {
        Account acc = [SELECT Id, AnnualRevenue FROM Account WHERE Name = 'Test Account 01' LIMIT 1];
        acc.AnnualRevenue = 9999999;

        Test.startTest();
        AccountContactController.saveRecords(new List<Account>{ acc }, null);
        Test.stopTest();

        Account updated = [SELECT AnnualRevenue FROM Account WHERE Id = :acc.Id];
        System.assertEquals(9999999, updated.AnnualRevenue, 'Annual revenue should be updated');
    }

    @isTest
    static void testSaveContactFields() {
        Contact con = [SELECT Id, FirstName, LastName, Title FROM Contact WHERE FirstName = 'First0' LIMIT 1];
        con.FirstName = 'UpdatedFirst';
        con.Title     = 'Manager';

        Test.startTest();
        AccountContactController.saveRecords(null, new List<Contact>{ con });
        Test.stopTest();

        Contact updated = [SELECT FirstName, Title FROM Contact WHERE Id = :con.Id];
        System.assertEquals('UpdatedFirst', updated.FirstName, 'Contact first name should be updated');
        System.assertEquals('Manager',      updated.Title,     'Contact title should be updated');
    }

    @isTest
    static void testSaveContactEmail() {
        Contact con = [SELECT Id, Email FROM Contact WHERE FirstName = 'First1' LIMIT 1];
        con.Email = 'newemail@testorg.com';

        Test.startTest();
        AccountContactController.saveRecords(null, new List<Contact>{ con });
        Test.stopTest();

        Contact updated = [SELECT Email FROM Contact WHERE Id = :con.Id];
        System.assertEquals('newemail@testorg.com', updated.Email, 'Contact email should be updated');
    }

    @isTest
    static void testSaveBothAccountsAndContacts() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Account 01' LIMIT 1];
        acc.Phone = '111-222-3333';

        Contact con = [SELECT Id FROM Contact WHERE FirstName = 'First0' LIMIT 1];
        con.Email = 'saveall@testorg.com';

        Test.startTest();
        AccountContactController.saveRecords(new List<Account>{ acc }, new List<Contact>{ con });
        Test.stopTest();

        Account updatedAcc = [SELECT Phone FROM Account WHERE Id = :acc.Id];
        Contact updatedCon = [SELECT Email FROM Contact WHERE Id = :con.Id];

        System.assertEquals('111-222-3333',        updatedAcc.Phone, 'Account phone should be updated');
        System.assertEquals('saveall@testorg.com', updatedCon.Email, 'Contact email should be updated');
    }

    @isTest
    static void testSaveMultipleAccounts() {
        List<Account> accounts = [SELECT Id, Industry FROM Account WHERE Industry = 'Technology' LIMIT 3];
        for (Account acc : accounts) {
            acc.Industry = 'Healthcare';
        }

        Test.startTest();
        AccountContactController.saveRecords(accounts, null);
        Test.stopTest();

        Integer updatedCount = [SELECT COUNT() FROM Account WHERE Industry = 'Healthcare'];
        System.assertEquals(3, updatedCount, 'All 3 accounts should have updated industry');
    }

    @isTest
    static void testSaveMultipleContacts() {
        List<Contact> contacts = [SELECT Id, Title FROM Contact WHERE Title = 'Developer'];
        for (Contact con : contacts) {
            con.Title = 'Senior Developer';
        }

        Test.startTest();
        AccountContactController.saveRecords(null, contacts);
        Test.stopTest();

        Integer updatedCount = [SELECT COUNT() FROM Contact WHERE Title = 'Senior Developer'];
        System.assertEquals(contacts.size(), updatedCount, 'All contacts should have updated title');
    }

    // ── Edge cases ───────────────────────────────────────────────────────────

    @isTest
    static void testSaveWithBothNullInputs() {
        Test.startTest();
        try {
            AccountContactController.saveRecords(null, null);
            System.assert(true, 'Null inputs should be handled gracefully');
        } catch (Exception e) {
            System.assert(false, 'Should not throw for null inputs: ' + e.getMessage());
        }
        Test.stopTest();
    }

    @isTest
    static void testSaveWithEmptyLists() {
        Test.startTest();
        try {
            AccountContactController.saveRecords(new List<Account>(), new List<Contact>());
            System.assert(true, 'Empty lists should be handled gracefully');
        } catch (Exception e) {
            System.assert(false, 'Should not throw for empty lists: ' + e.getMessage());
        }
        Test.stopTest();
    }

    @isTest
    static void testSaveWithNullAccountsAndEmptyContacts() {
        Test.startTest();
        try {
            AccountContactController.saveRecords(null, new List<Contact>());
            System.assert(true, 'Mixed null/empty inputs should be handled gracefully');
        } catch (Exception e) {
            System.assert(false, 'Should not throw: ' + e.getMessage());
        }
        Test.stopTest();
    }

    @isTest
    static void testTotalCountAccuracy() {
        // Add one more account to verify totalCount stays in sync
        insert new Account(Name = 'Extra Account', Industry = 'Retail', Type = 'Prospect');

        Test.startTest();
        Map<String, Object> result = AccountContactController.getAccountsWithContacts(5, 1);
        Test.stopTest();

        Integer totalCount = (Integer) result.get('totalCount');
        System.assertEquals(16, totalCount, 'Total count should reflect newly inserted account');
    }
}
