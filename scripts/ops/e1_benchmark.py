"""Extract only transaction capacity metadata from disposable staging logs."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

import boto3

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    rows = []
    for page in session.client('logs').get_paginator('filter_log_events').paginate(
            logGroupName='/aws/lambda/staging-e1-jhoselyn-despacho-api', filterPattern='"CORE_TRANSACTION"'):
        for event in page['events']:
            raw = event['message']; start, end = raw.find('{'), raw.rfind('}')
            if start < 0: continue
            item = json.loads(raw[start:end + 1])
            if item.get('event') == 'CORE_TRANSACTION':
                rows.append({'actions': item['action_count'], 'units': item['consumed_capacity'],
                             'read_units': item.get('read_units'), 'write_units': item.get('write_units')})
    assert rows
    prices = {}
    pricing = session.client('pricing')
    for usage in ['ReadRequestUnits', 'WriteRequestUnits']:
        result = pricing.get_products(ServiceCode='AmazonDynamoDB', Filters=[
            {'Type': 'TERM_MATCH', 'Field': 'location', 'Value': 'US East (N. Virginia)'},
            {'Type': 'TERM_MATCH', 'Field': 'usagetype', 'Value': usage}])
        products = [json.loads(value) for value in result['PriceList']]
        assert len(products) == 1
        dimensions = [dimension for term in products[0]['terms']['OnDemand'].values() for dimension in term['priceDimensions'].values()]
        assert len(dimensions) == 1 and dimensions[0]['unit'] == usage
        prices[usage] = float(dimensions[0]['pricePerUnit']['USD'])
    priced = [row for row in rows if row['read_units'] is not None and row['write_units'] is not None]
    costs = [row['read_units'] * prices['ReadRequestUnits'] + row['write_units'] * prices['WriteRequestUnits'] for row in priced]
    report = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'environment': 'staging-e1-',
        'successful_command_transactions': len(rows), 'observed_action_counts': sorted(set(row['actions'] for row in rows)),
        'capacity_units': {'min': min(row['units'] for row in rows), 'max': max(row['units'] for row in rows),
                           'mean': sum(row['units'] for row in rows) / len(rows)},
        'interpretation': 'Command transactions only. Excludes pre-reads, worker, queues, network, logs and storage. Older logs contain TOTAL units only.',
        'regional_usd_per_request_unit': prices, 'tariff_source': 'AWS Pricing GetProducts, us-east-1, Standard on-demand',
        'priced_transactions': len(priced),
        'partial_transaction_cost_usd': {'min': min(costs), 'max': max(costs), 'mean': sum(costs)/len(costs)} if costs else None,
        'transaction_component_usd_upper_bound': {'min_observed_units': min(row['units'] for row in rows) * max(prices.values()),
             'max_observed_units': max(row['units'] for row in rows) * max(prices.values()),
             'basis': 'Reported aggregate capacity units times the larger regional unit price; excludes other operation components.'},
        'billed_amount': False, 'cost_reason': 'Gross list-price estimate for the transaction component; excludes credits/free tier and other operation components.'}
    (ROOT / 'docs/operations/e1-benchmark.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__': main()
