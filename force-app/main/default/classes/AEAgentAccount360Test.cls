@IsTest
private class AEAgentAccount360Test {

    @TestSetup
    static void setupData() {
        Account acct = new Account(
            Name = 'Acme Corp',
            Industry = 'Manufacturing',
            Type = 'Customer - Direct',
            Rating = 'Warm',
            AnnualRevenue = 10000000,
            NumberOfEmployees = 500
        );
        insert acct;

        // Create contacts
        List<Contact> contacts = new List<Contact>();
        contacts.add(new Contact(
            FirstName = 'Jane',
            LastName = 'Doe',
            Title = 'VP of Sales',
            Email = 'jane.doe@acme.example.com',
            Department = 'Sales',
            AccountId = acct.Id
        ));
        contacts.add(new Contact(
            FirstName = 'John',
            LastName = 'Smith',
            Title = 'CTO',
            Email = 'john.smith@acme.example.com',
            Department = 'Engineering',
            AccountId = acct.Id
        ));
        insert contacts;

        // Create opportunities
        List<Opportunity> opps = new List<Opportunity>();
        opps.add(new Opportunity(
            Name = 'Acme Renewal 2025',
            StageName = 'Negotiation/Review',
            Amount = 250000,
            CloseDate = Date.today().addDays(30),
            AccountId = acct.Id
        ));
        opps.add(new Opportunity(
            Name = 'Acme Expansion',
            StageName = 'Closed Won',
            Amount = 100000,
            CloseDate = Date.today().addDays(-60),
            AccountId = acct.Id
        ));
        insert opps;

        // Create cases
        insert new Case(
            Subject = 'Login issue',
            Status = 'New',
            Priority = 'High',
            AccountId = acct.Id
        );

        // Create contract
        insert new Contract(
            AccountId = acct.Id,
            Status = 'Draft',
            StartDate = Date.today().addDays(-365),
            ContractTerm = 12
        );

        // Create tasks
        insert new Task(
            Subject = 'Follow up call',
            Status = 'Open',
            ActivityDate = Date.today(),
            WhatId = acct.Id
        );

        // Create events
        insert new Event(
            Subject = 'QBR Meeting',
            StartDateTime = Datetime.now().addDays(-7),
            EndDateTime = Datetime.now().addDays(-7).addHours(1),
            WhatId = acct.Id
        );
    }

    @IsTest
    static void testGetAccount360_Success() {
        Account acct = [SELECT Id FROM Account WHERE Name = 'Acme Corp' LIMIT 1];

        AEAgentAccount360.Account360Request req = new AEAgentAccount360.Account360Request();
        req.accountId = acct.Id;

        Test.startTest();
        List<AEAgentAccount360.Account360Response> results =
            AEAgentAccount360.getAccount360(new List<AEAgentAccount360.Account360Request>{ req });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return one response');
        System.assertEquals(true, results[0].success, 'Should be successful');

        String view = results[0].account360;
        System.assert(view.contains('CUSTOMER TENURE'), 'Should contain tenure section');
        System.assert(view.contains('CONTRACTS & RENEWALS'), 'Should contain contracts section');
        System.assert(view.contains('OPPORTUNITY PIPELINE'), 'Should contain opps section');
        System.assert(view.contains('OPEN CASES'), 'Should contain cases section');
        System.assert(view.contains('KEY CONTACTS'), 'Should contain contacts section');
        System.assert(view.contains('RECENT ACTIVITIES'), 'Should contain activities section');
        System.assert(view.contains('Jane Doe'), 'Should contain contact name');
        System.assert(view.contains('Acme Renewal 2025'), 'Should contain opportunity name');
        System.assert(view.contains('Login issue'), 'Should contain case subject');
    }

    @IsTest
    static void testGetAccount360_NotFound() {
        Id fakeId = Account.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

        AEAgentAccount360.Account360Request req = new AEAgentAccount360.Account360Request();
        req.accountId = fakeId;

        Test.startTest();
        List<AEAgentAccount360.Account360Response> results =
            AEAgentAccount360.getAccount360(new List<AEAgentAccount360.Account360Request>{ req });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return one response');
        System.assertEquals(false, results[0].success, 'Should not be successful');
        System.assert(String.isNotBlank(results[0].errorMessage), 'Should have error message');
    }

    @IsTest
    static void testGetAccount360_EmptyRequest() {
        Test.startTest();
        List<AEAgentAccount360.Account360Response> results =
            AEAgentAccount360.getAccount360(new List<AEAgentAccount360.Account360Request>());
        Test.stopTest();

        System.assertEquals(0, results.size(), 'Should return empty list for empty request');
    }

    @IsTest
    static void testGetAccount360_AccountWithNoRelatedRecords() {
        Account emptyAcct = new Account(Name = 'Empty Account');
        insert emptyAcct;

        AEAgentAccount360.Account360Request req = new AEAgentAccount360.Account360Request();
        req.accountId = emptyAcct.Id;

        Test.startTest();
        List<AEAgentAccount360.Account360Response> results =
            AEAgentAccount360.getAccount360(new List<AEAgentAccount360.Account360Request>{ req });
        Test.stopTest();

        System.assertEquals(true, results[0].success, 'Should succeed even with no related records');
        System.assert(results[0].account360.contains('No contracts on file'), 'Should indicate no contracts');
        System.assert(results[0].account360.contains('No opportunities found'), 'Should indicate no opps');
        System.assert(results[0].account360.contains('No contacts on file'), 'Should indicate no contacts');
    }
}
