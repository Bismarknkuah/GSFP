GSFP v2 — Caterer Features + Payment Enum Fix
==============================================

FILE PLACEMENT
--------------
backend/src/models/Payment.js           → REPLACE (fixes "pending_regional is not a valid enum" error)
backend/src/models/FoodTimetable.js     → NEW
backend/src/models/Expenditure.js       → NEW
backend/src/controllers/timetableController.js    → NEW
backend/src/controllers/expenditureController.js  → NEW
backend/src/controllers/paymentApprovalController.js → REPLACE
backend/src/routes/timetable.js         → NEW
backend/src/routes/expenditure.js       → NEW
backend/src/controllers/reportEditPatch.txt → INSTRUCTIONS for edit/resubmit + 2 photos + past dates
backend/ADD_TO_SERVER.txt               → 2 lines to add to server.js

frontend/src/components/caterer/CatererExtras.jsx    → NEW (FoodTimetableView + ExpenditureOffice)
frontend/src/components/district/TimetableEditor.jsx → NEW (DFC posts monthly menu)

WIRING THE FRONTEND
-------------------
1. In CatererDashboard.jsx add at top:
     import { FoodTimetableView, ExpenditureOffice } from './CatererExtras';
   Then render <FoodTimetableView/> on the overview (e.g. after the weekly chart),
   and add a view: if (view==='expenses') return <ExpenditureOffice/>;

2. In App.jsx add routes:
     case 'timetable':  return user.role==='district_coordinator' ? <TimetableEditor/> : <CatererDashboard view="overview"/>;
     case 'expenses':   return <CatererDashboard view="expenses"/>;
   And import TimetableEditor from './components/district/TimetableEditor';

3. In Shell.jsx sidebar add:
   - For caterer:   { id:'expenses',  label:'My Expenses',  icon:Wallet }
   - For district_coordinator: { id:'timetable', label:'Food Timetable', icon:CalendarDays }

server.js — ADD:
   app.use('/api/timetable',   require('./routes/timetable'));
   app.use('/api/expenditure', require('./routes/expenditure'));

WHY THE PAYMENT ERROR HAPPENED
------------------------------
Your deployed Payment model's status enum only had:
  ['partial','fully-paid']
but the approval controller sets status='pending_regional'.
The new Payment.js includes all chain statuses so validation passes.

DEPLOY
------
git add . ; git commit -m "Caterer features + payment enum fix" ; git push origin main
