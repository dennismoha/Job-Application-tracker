const sections = [
  ['introduction', '1. Introduction'],
  ['information', '2. Information We Collect and Process'],
  ['use', '3. How We Use Information'],
  ['ai', '4. AI Processing and Data Minimization'],
  ['security', '5. Storage and Security'],
  ['deletion', '6. Account Deletion and Data Retention'],
  ['sharing', '7. Sharing of Information'],
  ['payments', '8. Premium Services and Payments'],
  ['rights', '9. User Choices and Privacy Rights'],
  ['children', "10. Children's Privacy"],
  ['changes', '11. Changes to This Privacy Policy'],
  ['contact', '12. Contact Information'],
  ['chrome-store', '13. Chrome Web Store User Data Commitment'],
];

export default function Privacy() {
  return (
    <main className="public-content-page">
      <article className="public-content-card privacy-card">
        <header className="privacy-header">
          <p>Job Intelligence Companion</p>
          <h1>Privacy Policy</h1>
          <p className="privacy-date">
            <strong>Effective date:</strong> 14 October 2026
            <br />
            <strong>Last updated:</strong> 14 October 2026
          </p>
        </header>

        <nav aria-label="Privacy policy sections" className="privacy-toc">
          <h2>On this page</h2>
          <ul>
            {sections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="privacy-sections">
          <section aria-labelledby="introduction">
            <h2 id="introduction">1. Introduction</h2>
            <p>
              Job Intelligence Companion (“we,” “our,” or “us”) provides a browser extension and
              connected website that help users capture and bookmark job opportunities, compare job
              requirements with their CVs, prepare application materials, identify previously
              tracked opportunities, and manage their job search.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, store, share, and delete information
              when users interact with Job Intelligence Companion.
            </p>
            <p>
              <strong>Publisher:</strong> smart coders
              <br />
              <strong>Contact email:</strong> denniskinoti015@gmail.com
              <br />
              {/* <strong>Website:</strong> [Your website URL] */}
              <br />
              {/* <strong>Account deletion page:</strong> [Your account deletion URL] */}
            </p>
          </section>

          <section aria-labelledby="information">
            <h2 id="information">2. Information We Collect and Process</h2>
            <p>The information we process depends on the features users choose to use.</p>

            <h3>2.1 Account information</h3>
            <p>
              When users register for or access the connected website, we may process account
              information such as names, email addresses, account identifiers, and other details
              provided during registration or account management.
            </p>

            <h3>2.2 Job listing information</h3>
            <p>
              When users capture or bookmark a job listing, we may process its title, company name,
              description, location, URL, and other relevant job-related information available on
              supported websites.
            </p>
            <p>
              This information allows users to save opportunities, review them later, and compare
              current listings with previously tracked jobs.
            </p>

            <h3>2.3 CVs and professional information</h3>
            <p>
              When users use CV comparison or application preparation features, we may process CV
              content, employment history, professional experience, qualifications, skills, and
              other information relevant to a job application.
            </p>
            <p>
              CVs may contain personally identifiable information, including names, email addresses,
              telephone numbers, and residential addresses.
            </p>

            <h3>2.4 Job tracking and application records</h3>
            <p>
              We store job and application-related information in our databases to support
              bookmarking, job management, application tracking, and duplicate detection. Depending
              on the features used, these records may include job titles, company names, URLs,
              application statuses, dates, and other information users provide.
            </p>
            <p>
              Matching a job against existing records can help identify previously saved or tracked
              opportunities. A match does not necessarily confirm that a user applied to that job
              through another website or service.
            </p>

            <h3>2.5 Technical information</h3>
            <p>
              Our infrastructure may process technical information required to operate, secure, and
              troubleshoot the service, such as timestamps, error reports, and server logs. The
              information collected and its retention depend on the systems and configurations used.
            </p>
          </section>

          <section aria-labelledby="use">
            <h2 id="use">3. How We Use Information</h2>
            <p>
              We use information to provide and maintain the Extension&apos;s intended
              functionality, including:
            </p>
            <ul>
              <li>Capturing and bookmarking job opportunities.</li>
              <li>Saving and retrieving job listings.</li>
              <li>Comparing job requirements with CV content.</li>
              <li>Identifying relevant qualifications and potential skill gaps.</li>
              <li>Suggesting improvements to CV content.</li>
              <li>
                Preparing tailored CV content, cover letters, and other application materials.
              </li>
              <li>Identifying possible matches with previously saved or tracked jobs.</li>
              <li>Organizing application records and tracking job-search progress.</li>
              <li>
                Maintaining, securing, and troubleshooting the Extension and connected website.
              </li>
            </ul>
            <p>
              We do not sell users&apos; personal information or use it for purposes incompatible
              with this Privacy Policy.
            </p>
          </section>

          <section aria-labelledby="ai">
            <h2 id="ai">4. AI Processing and Data Minimization</h2>
            <p>
              Job Intelligence Companion uses AI services, including ChatGPT and Gemini, for
              supported CV comparison and application assistance features.
            </p>

            <h3>4.1 Removing personal identifiers before AI comparison</h3>
            <p>
              Before sending information to an AI service for CV comparison, we make reasonable
              efforts to remove personal identifiers, such as names, addresses, and other direct
              identifying details, and send only the information considered relevant to the
              comparison.
            </p>
            <p>
              This process is intended to minimize the personal information shared with AI providers
              while preserving relevant professional information, such as skills, qualifications,
              and work experience.
            </p>
            <p>
              Removing direct identifiers does not guarantee complete anonymization. Other details
              in a CV or professional history may still make a person identifiable.
            </p>

            <h3>4.2 Generating CVs and application materials</h3>
            <p>
              After comparison, relevant personal details may be reintroduced when necessary to
              generate a personalized CV or other application materials. Depending on the feature
              selected, content may be processed through our service or users may be redirected to
              an external AI service with relevant information for further assistance.
            </p>
            <p>
              Where information is sent directly to an external AI service, that information is
              subject to the applicable service&apos;s privacy terms and data-handling practices.
            </p>
            <p>Users should review generated content before submitting it to employers.</p>

            <h3>4.3 Third-party AI providers</h3>
            <p>
              We use ChatGPT and Gemini for supported AI-powered features. The information sent to
              each provider depends on the feature, integration, and information required to perform
              the requested task.
            </p>
            <p>
              We aim to minimize the information shared with these providers and make reasonable
              efforts to remove direct personal identifiers before CV comparison. We do not
              guarantee that every identifier is removed or that every AI request contains no
              personal information.
            </p>

            <h3>4.4 AI data retention and deletion</h3>
            <p>
              When users delete their information from Job Intelligence Companion, that deletion
              does not automatically establish that information previously transmitted to an AI
              provider has also been deleted from that provider&apos;s systems.
            </p>
            <p>
              Retention and deletion of information processed by OpenAI and Google are governed by
              the applicable provider terms, privacy documentation, product configuration, and
              retention controls. Users can review the providers&apos; official documentation:
            </p>
            <ul>
              <li>
                <strong>OpenAI:</strong>{' '}
                <a href="https://developers.openai.com/api/docs/guides/your-data">
                  Data controls in the OpenAI platform
                </a>
              </li>
              <li>
                <strong>Google Gemini:</strong>{' '}
                <a href="https://ai.google.dev/gemini-api/docs/zdr">
                  Gemini API zero-data-retention documentation
                </a>
              </li>
              {/* <li>
                <strong>n8n:</strong>{' '}
                <a href="https://ai.google.dev/gemini-api/docs/zdr">
                  Gemini API zero-data-retention documentation
                </a>
              </li> */}
            </ul>
            <p>
              We do not promise a fixed deletion timeframe for information held by these providers
              because their retention practices depend on the applicable service, configuration, and
              terms.
            </p>
          </section>

          <section aria-labelledby="security">
            <h2 id="security">5. Storage and Security</h2>
            <p>
              Job records and application-related information are stored in our databases to support
              users&apos; accounts and job-search workflows.
            </p>
            <p>
              Depending on the feature, account information, CV-related information, settings, and
              application records may also be stored in our connected services.
            </p>
            <p>
              We take reasonable technical and organizational measures to protect information
              against unauthorized access, disclosure, alteration, or destruction. These measures
              may include access controls, secure network transmission, and appropriate database
              security practices.
            </p>
            <p>No system can guarantee absolute security.</p>
          </section>

          <section aria-labelledby="deletion">
            <h2 id="deletion">6. Account Deletion and Data Retention</h2>
            <p>
              Users can access the connected Job Intelligence Companion website and use the
              available account deletion functionality to request deletion of their personal
              information and associated records.
            </p>

            <h3>6.1 Deletion from our systems</h3>
            <p>
              When a user initiates account deletion, we initiate the removal of associated personal
              information and records from the relevant systems under our control.
            </p>
            <p>
              We aim to complete deletion promptly. We allow a maximum recovery window of one hour
              for residual data that may remain because of temporary downtime, processing delays, or
              recovery procedures.
            </p>
            <p>
              Our policy is not to retain users&apos; deleted personal information beyond this
              one-hour recovery window in the systems covered by that policy, subject to applicable
              legal obligations and any separately disclosed technical limitations.
            </p>
            <p>
              This one-hour window applies to our own deletion and recovery processes. It is not a
              guarantee of immediate deletion from third-party services, independent backups, or
              systems outside our control.
            </p>

            <h3>6.2 AI providers and external services</h3>
            <p>
              Deleting information from our website and databases does not automatically delete
              information already transmitted to OpenAI, Google, or another external service.
            </p>
            <p>
              Any such information is handled according to the relevant provider&apos;s applicable
              privacy documentation, terms, retention settings, and deletion procedures. We do not
              claim that these providers delete information within our one-hour recovery window.
            </p>

            <h3>6.3 Backups, logs, and legal obligations</h3>
            <p>
              Where applicable, backups, technical logs, and records required by law may be subject
              to separate retention requirements. We aim to limit such retention to what is
              necessary and consistent with applicable law and our disclosed practices.
            </p>

            <h3>6.4 Uninstalling the Extension</h3>
            <p>
              Uninstalling the browser extension does not automatically delete information already
              stored in our databases or connected website. To request deletion of associated
              account information and application records, users should use the account deletion
              functionality on our website.
            </p>
          </section>

          <section aria-labelledby="sharing">
            <h2 id="sharing">7. Sharing of Information</h2>
            <p>We do not sell users&apos; personal information.</p>
            <p>
              We may share or transmit information to service providers where necessary to provide
              requested features. These providers may include:
            </p>
            <ul>
              <li>Hosting and backend infrastructure providers.</li>
              <li>Database and storage providers.</li>
              <li>OpenAI services used for supported AI functionality.</li>
              <li>Google Gemini services used for supported AI functionality.</li>
              <li>Other external services explicitly used by a feature selected by the user.</li>
            </ul>
            <p>
              We aim to limit information shared with providers to what is reasonably necessary for
              the requested functionality.
            </p>
            <p>
              Information may also be disclosed when required by law or when necessary to protect
              the security and integrity of our service.
            </p>
          </section>

          <section aria-labelledby="payments">
            <h2 id="payments">8. Premium Services and Payments</h2>
            <p>
              Job Intelligence Companion may introduce paid subscriptions or premium features in the
              future.
            </p>
            <p>
              If paid services are introduced, payment information may be processed by a payment
              service provider. Depending on the provider and payment method, this may involve
              billing details, transaction identifiers, subscription status, or payment-related
              records.
            </p>
            <p>
              We do not currently represent that we collect or store users&apos; full payment card
              details.
            </p>
            <p>
              Before introducing payment collection, we will update this Privacy Policy as necessary
              to explain the payment provider, the information processed, and the applicable payment
              data-handling practices.
            </p>
          </section>

          <section aria-labelledby="rights">
            <h2 id="rights">9. User Choices and Privacy Rights</h2>
            <p>
              Users can choose which job listings to capture and which optional CV comparison or
              application preparation features to use.
            </p>
            <p>
              Users can access the connected website to manage their accounts and request deletion
              of their personal information.
            </p>
            <p>
              Subject to applicable law, users may also request access to or correction of their
              personal information by contacting us using the details provided below.
            </p>
            <p>
              Users should be aware that information previously sent to external AI services may be
              subject to separate provider retention and deletion procedures.
            </p>
          </section>

          <section aria-labelledby="children">
            <h2 id="children">10. Children&apos;s Privacy</h2>
            <p>
              Job Intelligence Companion is intended for job seekers and professional use, rather
              than specifically for children. We do not knowingly collect personal information from
              children in violation of applicable law.
            </p>
          </section>

          <section aria-labelledby="changes">
            <h2 id="changes">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy when our features, data practices, third-party
              services, or legal obligations change.
            </p>
            <p>
              The latest version will be published at our designated Privacy Policy URL, with the
              last updated date shown at the beginning of the document.
            </p>
            <p>Where required, we will provide additional notice of material changes.</p>
          </section>

          <section aria-labelledby="contact">
            <h2 id="contact">12. Contact Information</h2>
            <p>
              For privacy questions, account deletion issues, or requests concerning personal
              information, contact:
            </p>
            <p>
              <strong>Publisher:</strong> smart coders
              <br />
              <strong>Email:</strong> denniskinoti015@gmail.com
              <br />
              {/* <strong>Website:</strong> [Your website URL]
              <br />
              <strong>Account deletion page:</strong> [Your account deletion URL] */}
            </p>
          </section>

          <section aria-labelledby="chrome-store">
            <h2 id="chrome-store">13. Chrome Web Store User Data Commitment</h2>
            <p>
              We handle information obtained through Chrome extension permissions in accordance with
              the Chrome Web Store User Data Policy, including its Limited Use requirements.
            </p>
            <p>
              Information obtained through the Extension is used for its disclosed user-facing
              functionality and other purposes permitted by applicable policies. We do not sell
              users&apos; personal information or use it for personalized advertising.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
