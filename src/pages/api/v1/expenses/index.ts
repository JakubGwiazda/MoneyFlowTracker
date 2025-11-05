// import type { APIRoute } from 'astro';
// import { createExpenseSchema } from '../../../../lib/validators/expenses';
// import type { CreateExpenseCommand, ExpenseDto } from '../../../../types';
// import { createExpense } from '../../../../lib/services/expenses.service';
// import { scheduleClassification } from '../../../../lib/services/classification.service';
// import { jsonResponse, ApiResponses } from '../../../../lib/utils/api-response';

// export const prerender = false;

// /**
//  * POST /api/v1/expenses
//  * Creates a new expense record and initiates AI classification.
//  * 
//  * Requires JWT authentication via Authorization header.
//  * Returns 201 with ExpenseDto on success.
//  */
// export const POST: APIRoute = async (context) => {
//   try {
//     // Check if user is authenticated (middleware should set this)
//     const supabase = context.locals.supabase;
//     const user = context.locals.user;

//     if (!supabase) {
//       return ApiResponses.databaseError();
//     }

//     if (!user) {
//       return ApiResponses.unauthorized();
//     }

//     // Parse and validate request body
//     let requestBody;
//     try {
//       requestBody = await context.request.json();
//     } catch (error) {
//       return ApiResponses.invalidJson();
//     }

//     // Validate input with Zod schema
//     const validationResult = createExpenseSchema.safeParse(requestBody);
//     if (!validationResult.success) {
//       return ApiResponses.validationError(
//         'Invalid input data',
//         validationResult.error.errors
//       );
//     }

//     const command: CreateExpenseCommand = validationResult.data;

//     // Create expense using the service
//     let expenseDto: ExpenseDto;
//     try {
//       expenseDto = await createExpense(command, user.id, supabase);
//     } catch (serviceError: any) {
//       // Handle specific service errors
//       if (serviceError.message === 'CATEGORY_NOT_FOUND') {
//         return ApiResponses.notFound('Category');
//       }
      
//       if (serviceError.message === 'CATEGORY_INACTIVE') {
//         return ApiResponses.forbidden('The specified category is not active');
//       }

//       // Generic service error
//       console.error('Service error creating expense:', serviceError);
//       return ApiResponses.serverError('Failed to create expense');
//     }

//     // Schedule AI classification (fire-and-forget)
//     try {
//       scheduleClassification(expenseDto, supabase);
//     } catch (classificationError) {
//       // Log but don't fail the request - classification is optional
//       console.error('Failed to schedule classification:', classificationError);
//     }

//     return jsonResponse(expenseDto, 201);

//   } catch (error) {
//     console.error('Error creating expense:', error);
//     return ApiResponses.serverError();
//   }
// };
