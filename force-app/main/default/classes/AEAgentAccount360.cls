/**
 * Invocable action for the AE Agent to retrieve Account 360 view.
 * Provides a comprehensive view including: customer tenure, renewal info,
 * recent opportunities, open cases, recent activities, and contacts.
 */
public with sharing class AEAgentAccount360 {

    public class Account360Request {
        @InvocableVariable(required=true description='The Account record Id')
        public Id accountId;
    }

    public class Account360Response {
        @InvocableVariable(description='The formatted Account 360 view text')
        public String account360;

        @InvocableVariable(description='True if the account was found')
        public Boolean success;

        @InvocableVariable(description='Error message if the account was not found')
        public String errorMessage;
    }

    @InvocableMethod(
        label='Get Account 360'
        description='Retrieves a comprehensive Account 360 view including tenure, renewals, opportunities, cases, and activities'
        category='AE Agent'
    )
    public static List<Account360Response> getAccount360(List<Account360Request> requests) {
        List<Account360Response> responses = new List<Account360Response>();

        // Only process first request to avoid governor limits in bulk
        if (requests.isEmpty()) {
            return responses;
        }

        Id accountId = requests[0].accountId;
        Account360Response resp = new Account360Response();

        List<Account> accounts = [
            SELECT Id, Name, Industry, Type, Rating, AnnualRevenue,
                   NumberOfEmployees, Owner.Name, CreatedDate,
                   Phone, Website, Description
            FROM Account
            WHERE Id = :accountId
            LIMIT 1
        ];

        if (accounts.isEmpty()) {
            resp.success = false;
            resp.errorMessage = 'Account not found for Id: ' + accountId;
            resp.account360 = '';
            responses.add(resp);
            return responses;
        }

        Account acct = accounts[0];
        List<String> sections = new List<String>();

        // Section 1: Customer Tenure
        sections.add(buildTenureSection(acct));

        // Section 2: Contracts & Renewals
        sections.add(buildContractSection(accountId));

        // Section 3: Opportunity Pipeline
        sections.add(buildOpportunitySection(accountId));

        // Section 4: Open Cases
        sections.add(buildCaseSection(accountId));

        // Section 5: Key Contacts
        sections.add(buildContactSection(accountId));

        // Section 6: Recent Activities
        sections.add(buildActivitySection(accountId));

        resp.success = true;
        resp.errorMessage = '';
        resp.account360 = String.join(sections, '\n\n');
        responses.add(resp);

        // Handle remaining requests with same pattern
        for (Integer i = 1; i < requests.size(); i++) {
            Account360Response additionalResp = new Account360Response();
            additionalResp.success = false;
            additionalResp.errorMessage = 'Bulk processing limited to first record. Query individually for additional accounts.';
            additionalResp.account360 = '';
            responses.add(additionalResp);
        }

        return responses;
    }

    private static String buildTenureSection(Account acct) {
        List<String> lines = new List<String>();
        lines.add('--- CUSTOMER TENURE ---');

        Date createdDate = acct.CreatedDate.date();
        Integer daysSinceCreated = createdDate.daysBetween(Date.today());
        Integer years = daysSinceCreated / 365;
        Integer months = Math.mod(daysSinceCreated, 365) / 30;

        lines.add('Customer Since: ' + acct.CreatedDate.format('MMMM d, yyyy'));

        String tenure = '';
        if (years > 0) {
            tenure = years + ' year' + (years > 1 ? 's' : '');
            if (months > 0) {
                tenure += ', ' + months + ' month' + (months > 1 ? 's' : '');
            }
        } else {
            tenure = months + ' month' + (months > 1 ? 's' : '');
        }
        lines.add('Tenure: ' + tenure);

        if (String.isNotBlank(acct.Type)) {
            lines.add('Account Type: ' + acct.Type);
        }
        if (String.isNotBlank(acct.Rating)) {
            lines.add('Rating: ' + acct.Rating);
        }

        return String.join(lines, '\n');
    }

    private static String buildContractSection(Id accountId) {
        List<String> lines = new List<String>();
        lines.add('--- CONTRACTS & RENEWALS ---');

        List<Contract> contracts = [
            SELECT Id, ContractNumber, Status, StartDate, EndDate,
                   ContractTerm, OwnerExpirationNotice
            FROM Contract
            WHERE AccountId = :accountId
            ORDER BY EndDate DESC
            LIMIT 5
        ];

        if (contracts.isEmpty()) {
            lines.add('No contracts on file.');
            return String.join(lines, '\n');
        }

        for (Contract c : contracts) {
            String contractLine = 'Contract #' + c.ContractNumber + ' | Status: ' + c.Status;
            if (c.StartDate != null) {
                contractLine += ' | Start: ' + String.valueOf(c.StartDate);
            }
            if (c.EndDate != null) {
                contractLine += ' | End: ' + String.valueOf(c.EndDate);
                Integer daysUntilEnd = Date.today().daysBetween(c.EndDate);
                if (daysUntilEnd > 0 && daysUntilEnd <= 90) {
                    contractLine += ' ⚠ RENEWAL DUE IN ' + daysUntilEnd + ' DAYS';
                } else if (daysUntilEnd <= 0) {
                    contractLine += ' ❌ EXPIRED';
                }
            }
            lines.add(contractLine);
        }

        return String.join(lines, '\n');
    }

    private static String buildOpportunitySection(Id accountId) {
        List<String> lines = new List<String>();
        lines.add('--- OPPORTUNITY PIPELINE ---');

        List<Opportunity> opps = [
            SELECT Id, Name, StageName, Amount, CloseDate, Probability,
                   Owner.Name, IsClosed, IsWon
            FROM Opportunity
            WHERE AccountId = :accountId
            ORDER BY CloseDate DESC
            LIMIT 10
        ];

        if (opps.isEmpty()) {
            lines.add('No opportunities found.');
            return String.join(lines, '\n');
        }

        Decimal totalOpen = 0;
        Decimal totalWon = 0;
        Integer openCount = 0;
        Integer wonCount = 0;

        for (Opportunity opp : opps) {
            String oppLine = opp.Name + ' | ' + opp.StageName;
            if (opp.Amount != null) {
                oppLine += ' | $' + opp.Amount.format();
            }
            if (opp.CloseDate != null) {
                oppLine += ' | Close: ' + String.valueOf(opp.CloseDate);
            }
            lines.add(oppLine);

            if (!opp.IsClosed && opp.Amount != null) {
                totalOpen += opp.Amount;
                openCount++;
            }
            if (opp.IsWon && opp.Amount != null) {
                totalWon += opp.Amount;
                wonCount++;
            }
        }

        lines.add('---');
        lines.add('Open Pipeline: ' + openCount + ' opps, $' + totalOpen.format());
        lines.add('Won (shown): ' + wonCount + ' opps, $' + totalWon.format());

        return String.join(lines, '\n');
    }

    private static String buildCaseSection(Id accountId) {
        List<String> lines = new List<String>();
        lines.add('--- OPEN CASES ---');

        List<Case> cases = [
            SELECT Id, CaseNumber, Subject, Status, Priority,
                   CreatedDate, Owner.Name
            FROM Case
            WHERE AccountId = :accountId
              AND IsClosed = false
            ORDER BY Priority ASC, CreatedDate DESC
            LIMIT 10
        ];

        if (cases.isEmpty()) {
            lines.add('No open cases. ✅');
            return String.join(lines, '\n');
        }

        for (Case c : cases) {
            String caseLine = 'Case #' + c.CaseNumber;
            if (String.isNotBlank(c.Subject)) {
                caseLine += ' | ' + c.Subject;
            }
            caseLine += ' | ' + c.Status + ' | Priority: ' + c.Priority;
            lines.add(caseLine);
        }

        lines.add('Total Open Cases: ' + cases.size());

        return String.join(lines, '\n');
    }

    private static String buildContactSection(Id accountId) {
        List<String> lines = new List<String>();
        lines.add('--- KEY CONTACTS ---');

        List<Contact> contacts = [
            SELECT Id, Name, Title, Email, Phone, Department
            FROM Contact
            WHERE AccountId = :accountId
            ORDER BY CreatedDate ASC
            LIMIT 10
        ];

        if (contacts.isEmpty()) {
            lines.add('No contacts on file.');
            return String.join(lines, '\n');
        }

        for (Contact con : contacts) {
            String contactLine = con.Name;
            if (String.isNotBlank(con.Title)) {
                contactLine += ' | ' + con.Title;
            }
            if (String.isNotBlank(con.Department)) {
                contactLine += ' | Dept: ' + con.Department;
            }
            if (String.isNotBlank(con.Email)) {
                contactLine += ' | ' + con.Email;
            }
            lines.add(contactLine);
        }

        return String.join(lines, '\n');
    }

    private static String buildActivitySection(Id accountId) {
        List<String> lines = new List<String>();
        lines.add('--- RECENT ACTIVITIES ---');

        List<Task> tasks = [
            SELECT Id, Subject, Status, ActivityDate, Owner.Name, Description
            FROM Task
            WHERE AccountId = :accountId
            ORDER BY ActivityDate DESC NULLS LAST
            LIMIT 5
        ];

        List<Event> events = [
            SELECT Id, Subject, StartDateTime, EndDateTime, Owner.Name
            FROM Event
            WHERE AccountId = :accountId
            ORDER BY StartDateTime DESC
            LIMIT 5
        ];

        if (tasks.isEmpty() && events.isEmpty()) {
            lines.add('No recent activities logged.');
            return String.join(lines, '\n');
        }

        if (!tasks.isEmpty()) {
            lines.add('Tasks:');
            for (Task t : tasks) {
                String taskLine = '  ' + (String.isNotBlank(t.Subject) ? t.Subject : '(No Subject)');
                taskLine += ' | ' + t.Status;
                if (t.ActivityDate != null) {
                    taskLine += ' | ' + String.valueOf(t.ActivityDate);
                }
                lines.add(taskLine);
            }
        }

        if (!events.isEmpty()) {
            lines.add('Events:');
            for (Event e : events) {
                String eventLine = '  ' + (String.isNotBlank(e.Subject) ? e.Subject : '(No Subject)');
                if (e.StartDateTime != null) {
                    eventLine += ' | ' + e.StartDateTime.format('yyyy-MM-dd HH:mm');
                }
                lines.add(eventLine);
            }
        }

        return String.join(lines, '\n');
    }
}
