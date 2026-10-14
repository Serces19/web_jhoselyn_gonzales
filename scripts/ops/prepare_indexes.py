"""Migration with dry-run default. Output contains counts only, no customer values."""
import argparse
import hashlib
import json
import boto3

def rows(table):
    kwargs={}
    while True:
        result=table.scan(**kwargs)
        yield from result.get('Items',[])
        if not result.get('LastEvaluatedKey'): break
        kwargs={'ExclusiveStartKey':result['LastEvaluatedKey']}

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--profile',required=True)
    p.add_argument('--prefix',default='')
    p.add_argument('--apply',action='store_true')
    args=p.parse_args()
    db=boto3.Session(profile_name=args.profile,region_name='us-east-1').resource('dynamodb')
    mappings=[];seen={};conflicts=0
    for item in rows(db.Table(args.prefix+'Appointments')):
        if item.get('status')=='CANCELLED': continue
        slot=item['date']+'#'+item['time']
        if slot in seen and seen[slot]!=item['appointment_id']:
            conflicts+=1
        seen[slot]=item['appointment_id']
        mappings.append(('BookingSlots',{'slot_id':slot,'appointment_id':item['appointment_id']}))
    slugs={}
    for item in rows(db.Table(args.prefix+'BlogPosts')):
        if item['slug'] in slugs: conflicts+=1
        slugs[item['slug']]=item['post_id']
        mappings.append(('OperationControl',{'pk':'SLUG#'+item['slug'],'post_id':item['post_id']}))
    if conflicts:
        print(json.dumps({'conflicts':conflicts,'applied':False}))
        raise SystemExit('Resolve duplicates before enabling booking')
    if args.apply:
        for table,item in mappings:
            key=next(iter(item));reference=list(item)[1]
            db.Table(args.prefix+table).put_item(Item=item,ConditionExpression=f'attribute_not_exists({key}) OR {reference} = :ref',ExpressionAttributeValues={':ref':item[reference]})
    print(json.dumps({'slots':len(seen),'slugs':len(slugs),'conflicts':conflicts,'applied':args.apply}))

if __name__=='__main__': main()
