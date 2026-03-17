/**
 * Invocable action for the AE Agent to retrieve an Account Summary.
 * Returns key account details: name, industry, type, owner, rating,
 * annual revenue, number of employees, and description.
 */
public with sharing class AEAgentAccountSummary {

    public class AccountSummaryRequest {
        @InvocableVariable(required=true description='The Account record Id')
        public Id accountId;
    }

    public class AccountSummaryResponse {
        @InvocableVariable(description='The formatted account summary text')
        public String summary;

        @InvocableVariable(description='True if the account was found')
        public Boolean success;

        @InvocableVariable(description='Error message if the account was not found')
        public String errorMessage;
    }

    @InvocableMethod(
        label='Get Account Summary'
        description='Retrieves a summary of key account information for the AE Agent'
        category='AE Agent'
    )
    public static List<AccountSummaryResponse> getAccountSummary(List<AccountSummaryRequest> requests) {
        List<AccountSummaryResponse> responses = new List<AccountSummaryResponse>();

        Set<Id> accountIds = new Set<Id>();
        for (AccountSummaryRequest req : requests) {
            accountIds.add(req.accountId);
        }

        Map<Id, Account> accountMap = new Map<Id, Account>([
            SELECT Id, Name, Industry, Type, AccountNumber,
                   Owner.Name, Rating, AnnualRevenue, NumberOfEmployees,
                   Phone, Website, BillingCity, BillingState, BillingCountry,
                   Description, CreatedDate, LastModifiedDate
            FROM Account
            WHERE Id IN :accountIds
        ]);

        for (AccountSummaryRequest req : requests) {
            AccountSummaryResponse resp = new AccountSummaryResponse();
            Account acct = accountMap.get(req.accountId);

            if (acct == null) {
                resp.success = false;
                resp.errorMessage = 'Account not found for Id: ' + req.accountId;
                resp.summary = '';
            } else {
                resp.success = true;
                resp.errorMessage = '';
                resp.summary = buildSummary(acct);
            }
            responses.add(resp);
        }

        return responses;
    }

    private static String buildSummary(Account acct) {
        List<String> parts = new List<String>();
        parts.add('**Account: ' + acct.Name + '**');

        if (String.isNotBlank(acct.AccountNumber)) {
            parts.add('Account Number: ' + acct.AccountNumber);
        }
        if (String.isNotBlank(acct.Industry)) {
            parts.add('Industry: ' + acct.Industry);
        }
        if (String.isNotBlank(acct.Type)) {
            parts.add('Type: ' + acct.Type);
        }
        if (acct.Owner != null && String.isNotBlank(acct.Owner.Name)) {
            parts.add('Owner: ' + acct.Owner.Name);
        }
        if (String.isNotBlank(acct.Rating)) {
            parts.add('Rating: ' + acct.Rating);
        }
        if (acct.AnnualRevenue != null) {
            parts.add('Annual Revenue: $' + acct.AnnualRevenue.format());
        }
        if (acct.NumberOfEmployees != null) {
            parts.add('Employees: ' + String.valueOf(acct.NumberOfEmployees));
        }
        if (String.isNotBlank(acct.Phone)) {
            parts.add('Phone: ' + acct.Phone);
        }
        if (String.isNotBlank(acct.Website)) {
            parts.add('Website: ' + acct.Website);
        }

        String location = buildLocation(acct);
        if (String.isNotBlank(location)) {
            parts.add('Location: ' + location);
        }

        if (String.isNotBlank(acct.Description)) {
            parts.add('Description: ' + acct.Description);
        }

        return String.join(parts, '\n');
    }

    private static String buildLocation(Account acct) {
        List<String> locationParts = new List<String>();
        if (String.isNotBlank(acct.BillingCity)) {
            locationParts.add(acct.BillingCity);
        }
        if (String.isNotBlank(acct.BillingState)) {
            locationParts.add(acct.BillingState);
        }
        if (String.isNotBlank(acct.BillingCountry)) {
            locationParts.add(acct.BillingCountry);
        }
        return String.join(locationParts, ', ');
    }
}
