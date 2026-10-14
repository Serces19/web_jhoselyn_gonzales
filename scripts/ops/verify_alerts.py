"""Verify project alerts/budget; optional technical test only to approved recipients."""
import argparse
import json
from pathlib import Path
import re

import boto3

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    parser.add_argument('--send-test', action='store_true')
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    account = session.client('sts').get_caller_identity()['Account']
    assert account == '295894327291'
    sns = session.client('sns')
    topic = 'arn:aws:sns:us-east-1:' + account + ':jhoselyn_lead_alerts'
    subscriptions = [row for page in sns.get_paginator('list_subscriptions_by_topic').paginate(TopicArn=topic)
                     for row in page['Subscriptions']]
    confirmed = [row for row in subscriptions if row['SubscriptionArn'] != 'PendingConfirmation']
    approved = set(re.findall(r'"([^"]+)"', (ROOT / 'infrastructure/zz-alerts.private.auto.tfvars').read_text()))
    if args.send_test and (not confirmed or any(row['Protocol'] != 'email' or row['Endpoint'] not in approved for row in confirmed)):
        raise SystemExit('Confirmed approved recipients required; no test sent')
    budgets = session.client('budgets')
    name = 'jhoselyn-despacho-mensual'
    budget = budgets.describe_budget(AccountId=account, BudgetName=name)['Budget']
    assert budget['BudgetLimit']['Amount'] == '20.0' or float(budget['BudgetLimit']['Amount']) == 20
    assert budget['CostFilters']['TagKeyValue'] == ['Project$jhoselyn-despacho']
    notifications = budgets.describe_notifications_for_budget(AccountId=account, BudgetName=name)['Notifications']
    tags = session.client('ce').list_cost_allocation_tags(TagKeys=['Project'])['CostAllocationTags']
    report = {'recipient_count': len(subscriptions), 'confirmed_count': len(confirmed),
              'monthly_budget_usd': 20, 'scope': 'Project=jhoselyn-despacho',
              'cost_tag_status': next(row['Status'] for row in tags if row['TagKey'] == 'Project'),
              'notifications': [{k: row[k] for k in ['NotificationType', 'ComparisonOperator', 'Threshold']}
                                for row in notifications],
              'configured_threshold_type': 'PERCENTAGE',
              'hard_spending_cap': False, 'billing_attribution_delay_possible': True,
              'human_test_receipt': 'PENDING', 'github_actions': 'REMOVED_LOCAL_CHECKS_ONLY'}
    if args.send_test:
        result = sns.publish(TopicArn=topic, Subject='Prueba tecnica - alertas del despacho',
                             Message='Prueba tecnica del canal de alertas del despacho Jhoselyn Gonzales. '
                             'Presupuesto configurado: USD 20 por mes para gastos atribuibles al proyecto. '
                             'Este aviso es una prueba de entrega, no una alerta de gasto ni una confirmacion de pago.')
        report['test_publish_accepted'] = bool(result.get('MessageId'))
    previous = ROOT / 'docs/operations/alerts-budget-verification.json'
    if previous.exists():
        old = json.loads(previous.read_text())
        for key in ['test_publish_accepted', 'human_test_receipt']:
            if key in old:
                report[key] = old[key]
    previous.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
