# UPI Matcher - Product Requirements Document

## Core Purpose & Success

**Mission Statement**: Automatically reconcile bank UPI transactions with PhonePe receipts and provide intelligent categorization to simplify expense tracking and financial analysis.

**Success Indicators**: 
- ≥90% transaction matching accuracy using amount and date correlation
- ≥70% automatic categorization accuracy after initial learning period
- Reduce manual reconciliation time from hours to minutes
- Enable detailed spending analysis and reporting

**Experience Qualities**: Efficient, Intelligent, Comprehensive

## Project Classification & Approach

**Complexity Level**: Complex Application - Advanced functionality with multiple data sources, OCR processing, machine learning categorization, and comprehensive reporting

**Primary User Activity**: Acting and Creating - Users actively manage transaction matching, approve categorizations, and create detailed financial reports

## Essential Features

### Data Ingestion & Processing
- **Bank Statement Upload**: CSV/Excel file parsing with automatic column detection
- **PhonePe Receipt Upload**: Image/PDF OCR processing to extract transaction details
- **Data Validation**: Automatic validation of extracted data with manual correction capabilities

### Intelligent Transaction Matching
- **Multi-Criteria Matching**: Primary matching on amount + date, secondary on UTR when available
- **Confidence Scoring**: Weighted scoring system for match quality assessment
- **Fuzzy Merchant Matching**: Smart text comparison for merchant name variations

### Automatic Categorization System
- **Rule-Based Engine**: Comprehensive categorization rules based on merchant patterns and keywords
- **Learning Algorithm**: System learns from user approvals to improve future categorizations
- **Custom Rules**: User-defined categorization rules for specific spending patterns
- **Category Management**: 8 predefined categories with ability to expand based on user needs

### Review & Approval Workflow
- **Visual Match Review**: Side-by-side comparison of bank transactions and PhonePe receipts
- **Bulk Operations**: Approve multiple high-confidence matches simultaneously
- **Category Override**: Manual category assignment with learning integration
- **Receipt Preview**: Full receipt image preview for verification

### Analytics & Reporting
- **Spending Analysis**: Category-wise spending breakdown with trend analysis
- **Match Statistics**: Success rates, categorization effectiveness metrics
- **Export Capabilities**: Enhanced CSV/Excel export with enriched transaction data

## Design Direction

### Visual Tone & Identity
**Emotional Response**: The interface should feel trustworthy, efficient, and professional while remaining approachable for non-technical users.

**Design Personality**: Clean, data-focused design that prioritizes clarity and functionality over decorative elements.

### Color Strategy
**Color Scheme Type**: Monochromatic with strategic accent colors

- **Primary Color**: Deep teal (oklch(0.45 0.15 180)) - conveys trust and stability for financial data
- **Secondary Color**: Slate blue (oklch(0.35 0.08 240)) - professional and calming
- **Accent Color**: Warm amber (oklch(0.70 0.15 60)) - highlights important actions and success states
- **Success/Approval**: Green tones for approved matches and successful operations
- **Warning/Pending**: Orange tones for pending reviews and attention-needed items
- **System/Auto**: Blue tones for system-generated categorizations and automated features

### Typography System
**Font Pairing Strategy**: Single font family (Inter) with varied weights for hierarchy

- **Primary Font**: Inter - Clean, highly legible sans-serif optimized for UI and data display
- **Typographic Hierarchy**: 
  - Headings: 600-700 weight for section titles
  - Body: 400 weight for general content
  - Data/Numbers: 500-600 weight for financial figures and statistics
  - Captions: 400 weight, smaller size for metadata

### UI Elements & Component Selection

**Component Usage**:
- **Tables**: Primary interface for transaction matching with sortable columns
- **Cards**: Grouping related information and statistics
- **Badges**: Status indicators, categories, and confidence scores  
- **Dialogs**: Receipt preview and detailed transaction review
- **Progress Bars**: Visual representation of matching and categorization rates
- **Tabs**: Main navigation between different functional areas

**Interactive States**:
- **Approval Actions**: Green styling for approve buttons with check icons
- **Rejection Actions**: Red/destructive styling with X icons  
- **Auto-categorized Indicators**: Bot icons with blue coloring
- **Confidence Scoring**: Color-coded badges (green=high, yellow=medium, red=low)

### Data Visualization
- **Match Confidence**: Color-coded percentage badges
- **Category Distribution**: Horizontal progress bars with relative sizing
- **Spending Trends**: Clean bar charts and trend indicators
- **Success Metrics**: Large number displays with contextual icons

## Technical Implementation

### Categorization Rules Engine
- **System Rules**: 15+ predefined rules covering common merchants and transaction types
- **User Learning**: Automatic rule creation and enhancement based on user approvals
- **Pattern Matching**: Merchant name patterns and keyword-based classification
- **Confidence Scoring**: Weighted scoring based on pattern match quality

### Data Persistence
- **Transaction Storage**: Persistent storage of bank transactions and receipts
- **Rule Storage**: User-created and enhanced categorization rules
- **Match History**: Complete audit trail of approvals and rejections
- **Statistics**: Historical performance metrics and trend data

### Processing Features
- **OCR Integration**: Extract transaction details from PhonePe receipt images
- **CSV Parsing**: Flexible parsing of various bank statement formats
- **Duplicate Detection**: Prevent duplicate transaction processing
- **Data Validation**: Ensure data consistency and format compliance

## User Interface Flow

1. **Upload Phase**: Users upload bank statements and PhonePe receipts
2. **Processing Phase**: System automatically matches transactions and applies categorization
3. **Review Phase**: Users review matches, approve/reject, and adjust categories
4. **Analysis Phase**: Generated reports and spending insights
5. **Export Phase**: Download enriched transaction data

## Success Metrics

- **Matching Accuracy**: >90% correct matches on amount+date correlation
- **Categorization Rate**: >70% transactions automatically categorized correctly
- **User Efficiency**: 80%+ reduction in manual reconciliation time
- **System Learning**: Improving categorization accuracy over time through user feedback

## Edge Cases & Problem Scenarios

- **Duplicate Transactions**: Handle near-duplicate transactions with different UTRs
- **Missing Receipts**: Graceful handling of bank transactions without corresponding receipts
- **OCR Errors**: Manual correction workflow for incorrectly extracted receipt data
- **Date Mismatches**: Flexible date matching for transactions processed on different days
- **Amount Variations**: Handle small amount differences due to fees or rounding

## Future Enhancements

- **Multi-bank Support**: Extend to support multiple bank statement formats
- **SMS Integration**: Auto-import UPI notifications from SMS
- **Mobile PWA**: Mobile-optimized interface for receipt capture
- **Advanced Analytics**: Spending trends, budgeting features, and financial insights
- **Team Collaboration**: Multi-user access with role-based permissions