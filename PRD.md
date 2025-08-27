# UPI Matcher App - Product Requirements Document

Create a multi-user application that intelligently matches and enriches bank UPI transactions with PhonePe receipt data through OCR processing and smart categorization.

**Experience Qualities**:
1. **Efficient** - Streamlines tedious manual reconciliation into automated matching workflows
2. **Intelligent** - Learns from user corrections to improve matching accuracy over time  
3. **Trustworthy** - Provides clear match confidence scores and allows manual review before applying changes

**Complexity Level**: Complex Application (advanced functionality, accounts)
- Multi-user support with role-based access, file processing, OCR integration, data persistence across sessions, and machine learning categorization requires sophisticated state management and data relationships.

## Essential Features

**File Upload & Processing**
- Functionality: Accept Excel/CSV bank statements and PhonePe receipt images/PDFs
- Purpose: Centralize all transaction data sources for comprehensive reconciliation
- Trigger: User clicks "Upload Bank Statement" or "Add Receipts" buttons
- Progression: File selection → Upload progress → Data parsing → Preview extracted data → Confirm import
- Success criteria: Files parsed correctly with 95%+ data extraction accuracy

**OCR Receipt Processing**
- Functionality: Extract UTR, merchant name, amount, date, and category hints from PhonePe receipts
- Purpose: Convert visual receipt data into structured, matchable transaction records
- Trigger: Receipt images uploaded to processing queue
- Progression: Image upload → OCR analysis → Data extraction → Manual correction interface → Save structured data
- Success criteria: Key transaction fields extracted with 80%+ accuracy from typical PhonePe receipts

**Transaction Matching Engine**
- Functionality: Match bank transactions with PhonePe receipts using amount+date and UTR
- Purpose: Automatically link sparse bank data with rich receipt information
- Trigger: Both bank and receipt data available for comparison
- Progression: Load transaction sets → Apply matching rules → Generate match scores → Present suggestions → User approval/rejection
- Success criteria: 90%+ of transactions matched correctly using primary rules

**Smart Categorization System**
- Functionality: Auto-categorize transactions and learn from user corrections
- Purpose: Reduce manual categorization work while building spending insights
- Trigger: New transactions processed or user edits existing categories
- Progression: Initial auto-category → User review/correction → System learning → Improved future predictions
- Success criteria: 70%+ auto-categorization accuracy after 3 months of usage

**Data Export & Reporting**
- Functionality: Generate enriched Excel/CSV with merged bank and receipt data
- Purpose: Provide comprehensive transaction records for accounting and analysis
- Trigger: User clicks "Export Data" with selected date range/filters
- Progression: Select export criteria → Data compilation → File generation → Download delivery
- Success criteria: Complete enriched dataset exported with all matched transaction details

## Edge Case Handling

- **Duplicate transactions**: Highlight potential duplicates with identical amounts/dates for user review
- **Missing receipt data**: Allow manual entry of merchant/category information for unmatched bank transactions  
- **OCR extraction errors**: Provide correction interface with confidence scores and suggested alternatives
- **Multiple matches**: Present ranked match options when one bank transaction could match several receipts
- **Historical data conflicts**: Handle cases where users re-upload overlapping data periods gracefully

## Design Direction

The design should feel professional and trustworthy like financial software, with clean data tables and clear visual hierarchy that instills confidence in the matching process while remaining approachable for family users.

Minimal interface that focuses attention on data accuracy and matching confidence, avoiding overwhelming users with too many options while providing necessary controls for review and correction.

## Color Selection

Complementary (opposite colors) - Using professional blue-green palette that communicates trust and accuracy, with warm orange accents for important actions and alerts.

- **Primary Color**: Deep Teal (oklch(0.45 0.15 180)) - Conveys trust, accuracy, and financial reliability
- **Secondary Colors**: Slate Blue (oklch(0.35 0.08 240)) for supporting elements and Cool Gray (oklch(0.85 0.02 180)) for backgrounds
- **Accent Color**: Warm Orange (oklch(0.70 0.15 60)) - Draws attention to important actions, approvals, and alerts
- **Foreground/Background Pairings**: 
  - Background (Cool Gray oklch(0.98 0.01 180)): Dark text (oklch(0.15 0.02 240)) - Ratio 16.8:1 ✓
  - Card (White oklch(1 0 0)): Dark text (oklch(0.15 0.02 240)) - Ratio 19.2:1 ✓
  - Primary (Deep Teal oklch(0.45 0.15 180)): White text (oklch(1 0 0)) - Ratio 8.4:1 ✓
  - Secondary (Slate Blue oklch(0.35 0.08 240)): White text (oklch(1 0 0)) - Ratio 11.2:1 ✓
  - Accent (Warm Orange oklch(0.70 0.15 60)): White text (oklch(1 0 0)) - Ratio 4.8:1 ✓

## Font Selection

Typography should convey precision and clarity essential for financial data, using clean sans-serif fonts that maintain excellent readability in data-dense interfaces.

- **Typographic Hierarchy**: 
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing  
  - H3 (Subsection): Inter Medium/18px/normal spacing
  - Body (Data Tables): Inter Regular/14px/relaxed line height for scanning
  - Caption (Meta Info): Inter Regular/12px/tight leading for secondary details

## Animations

Subtle and purposeful animations that communicate system processing states and guide user attention to important matching decisions without distracting from data accuracy verification.

- **Purposeful Meaning**: Processing animations indicate OCR and matching progress, gentle highlights draw attention to suggested matches requiring review
- **Hierarchy of Movement**: File upload progress, match confidence indicators, and approval state changes receive primary animation focus

## Component Selection

- **Components**: Tables for transaction data, Cards for receipt previews, Dialogs for detailed matching review, Forms for file uploads, Badges for match confidence scores, Progress indicators for OCR processing, Buttons with distinct primary/secondary styling for approval workflows
- **Customizations**: Custom match confidence visualization component, specialized transaction comparison layout not provided by shadcn
- **States**: Match approval buttons (approve/reject/override), file upload states (uploading/processing/complete/error), OCR processing indicators, category edit inline controls
- **Icon Selection**: Upload for file ingestion, Search for matching process, Check/X for approval actions, Edit for manual corrections, Download for export functions
- **Spacing**: Consistent 16px padding for cards, 24px gaps between major sections, 8px spacing within form groups, generous whitespace around data tables for scanning
- **Mobile**: Responsive table scrolling, stacked card layout for receipt previews, simplified approval interface with larger touch targets, collapsible detail sections for transaction matching