/**
 * Seed data for deposit-enabled events
 */

exports.seed = async function(knex) {
  // First, check if events already have deposit settings
  const events = await knex('events').select('id', 'title');
  
  if (events.length === 0) {
    console.log('No events found. Skipping deposit seed.');
    return;
  }

  // Update first few events to have deposit enabled
  const eventsToUpdate = events.slice(0, 3);
  
  for (const event of eventsToUpdate) {
    await knex('events')
      .where('id', event.id)
      .update({
        allow_deposit: true,
        deposit_type: 'percentage',
        deposit_value: 30, // 30% deposit
        min_deposit_amount: 50, // Minimum $50 deposit
        deposit_due_by: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
    
    console.log(`Updated event "${event.title}" to allow deposits`);
  }

  // Update one event to have fixed deposit amount
  if (events.length > 3) {
    const fixedDepositEvent = events[3];
    await knex('events')
      .where('id', fixedDepositEvent.id)
      .update({
        allow_deposit: true,
        deposit_type: 'fixed',
        deposit_value: 100, // Fixed $100 deposit
        min_deposit_amount: 100,
        deposit_due_by: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    
    console.log(`Updated event "${fixedDepositEvent.title}" with fixed deposit amount`);
  }

  console.log('Deposit seed completed successfully');
};
