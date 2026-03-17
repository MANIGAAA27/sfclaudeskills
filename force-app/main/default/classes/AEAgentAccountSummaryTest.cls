@IsTest
private class AEAgentAccountSummaryTest {

    @TestSetup
    static void setupData() {
        Account acct = new Account(
            Name = 'Test Corp',
            Industry = 'Technology',
            Type = 'Customer - Direct',
            Rating = 'Hot',
            AnnualRevenue = 5000000,
            NumberOfEmployees = 250,
            Phone = '555-0100',
            Website = 'https://testcorp.example.com',
            BillingCity = 'San Francisco',
            BillingState = 'CA',
            BillingCountry = 'USA',
            Description = 'A leading tech company'
        );
        insert acct;
    }

    @IsTest
    static void testGetAccountSummary_Success() {
        Account acct = [SELECT Id FROM Account WHERE Name = 'Test Corp' LIMIT 1];

        AEAgentAccountSummary.AccountSummaryRequest req = new AEAgentAccountSummary.AccountSummaryRequest();
        req.accountId = acct.Id;

        Test.startTest();
        List<AEAgentAccountSummary.AccountSummaryResponse> results =
            AEAgentAccountSummary.getAccountSummary(new List<AEAgentAccountSummary.AccountSummaryRequest>{ req });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return one response');
        System.assertEquals(true, results[0].success, 'Should be successful');
        System.assert(results[0].summary.contains('Test Corp'), 'Summary should contain account name');
        System.assert(results[0].summary.contains('Technology'), 'Summary should contain industry');
        System.assert(results[0].summary.contains('Customer - Direct'), 'Summary should contain type');
        System.assert(results[0].summary.contains('San Francisco'), 'Summary should contain city');
    }

    @IsTest
    static void testGetAccountSummary_NotFound() {
        // Use a fabricated Id that doesn't exist
        Id fakeId = Account.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

        AEAgentAccountSummary.AccountSummaryRequest req = new AEAgentAccountSummary.AccountSummaryRequest();
        req.accountId = fakeId;

        Test.startTest();
        List<AEAgentAccountSummary.AccountSummaryResponse> results =
            AEAgentAccountSummary.getAccountSummary(new List<AEAgentAccountSummary.AccountSummaryRequest>{ req });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return one response');
        System.assertEquals(false, results[0].success, 'Should not be successful');
        System.assert(String.isNotBlank(results[0].errorMessage), 'Should have error message');
    }

    @IsTest
    static void testGetAccountSummary_MinimalAccount() {
        Account minimalAcct = new Account(Name = 'Minimal Account');
        insert minimalAcct;

        AEAgentAccountSummary.AccountSummaryRequest req = new AEAgentAccountSummary.AccountSummaryRequest();
        req.accountId = minimalAcct.Id;

        Test.startTest();
        List<AEAgentAccountSummary.AccountSummaryResponse> results =
            AEAgentAccountSummary.getAccountSummary(new List<AEAgentAccountSummary.AccountSummaryRequest>{ req });
        Test.stopTest();

        System.assertEquals(true, results[0].success, 'Should be successful even with minimal data');
        System.assert(results[0].summary.contains('Minimal Account'), 'Summary should contain account name');
    }
}
