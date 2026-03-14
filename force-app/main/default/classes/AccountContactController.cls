public with sharing class AccountContactController {

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getAccountsWithContacts(Integer pageSize, Integer pageNumber) {
        Integer offset = (pageNumber - 1) * pageSize;

        List<Account> accounts = [
            SELECT Id, Name, Phone, Industry, AnnualRevenue,
                (SELECT Id, FirstName, LastName, Email, Phone, Title FROM Contacts ORDER BY LastName ASC)
            FROM Account
            ORDER BY Name ASC
            LIMIT :pageSize
            OFFSET :offset
        ];

        Integer totalCount = [SELECT COUNT() FROM Account];

        Map<String, Object> result = new Map<String, Object>();
        result.put('accounts', accounts);
        result.put('totalCount', totalCount);
        return result;
    }

    @AuraEnabled
    public static void saveRecords(List<Account> accounts, List<Contact> contacts) {
        List<SObject> toUpdate = new List<SObject>();
        if (accounts != null && !accounts.isEmpty()) {
            toUpdate.addAll(accounts);
        }
        if (contacts != null && !contacts.isEmpty()) {
            toUpdate.addAll(contacts);
        }
        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }
}
