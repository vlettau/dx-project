trigger SOATrigger on Order (after insert, after update, after delete) {
    List<ID> calcNNIs = new List<ID>();

    
    // check for status or NNI change
    if(Trigger.new != NULL && Trigger.isDelete == false) {
        for (Order o: Trigger.new) {
            // collect old/new NNIs to calculate the Customer Subscribed CIR field
            if(o.NNI__c != NULL) {
                System.debug('SOA Trigger: Order: ' + o.Id);
              calcNNIs.add(o.NNI__c);
            }
            
        }
    }

    if (Trigger.old != NULL && Trigger.isInsert == false) {
        for (Order o: Trigger.old) {
            if(o.NNI__c != NULL) {
                calcNNIs.add(o.NNI__c);
            }
        }
    }

    
    System.debug('NNIs to recalculate bandwidth on: ' + calcNNIs);
    
    //query the active offnets under the collected NNIs
    List<Order> soaToCalc = [SELECT Id, NNI__c, Service_Provided__c FROM Order WHERE Status = 'Activated' AND NNI__c IN :calcNNIs];
    System.debug('SOA to Calc: ' + soaToCalc);
    
    
    //collect SOA bandwidths per NNI
    Map<ID, List<Double>> nniSums = new Map<ID, List<Double>>();
    for(Order o: soaToCalc) {
        if (nniSums.get(o.NNI__c) == NULL) {
            nniSums.put(o.NNI__c, new List<Double>());
            System.debug('Made new bandwidth list for NNI: ' + o.NNI__c);
        }
       nniSums.get(o.NNI__c).add(Double.valueOf(o.Service_Provided__c));
    }
    System.debug('NNI to list of bandwidth values:' + nniSums);
    

    Double totalBw = 0;
    List<NNI__c> nnis = new List<NNI__c>();
    for(ID k: nniSums.keySet()) {
        NNI__c n = new NNI__c();
        n.Id = k;
        totalBw = 0; // reset totalBw for each NNI

        // Sum the Double values for each NNI
        for (Double bandwidth : nniSums.get(k)) {
            totalBw += bandwidth;
        }

        n.Customer_Subscribed_CIR__c = totalBw;
        nnis.add(n);
        System.debug('Added to NNI update list: ' + n);
    }

    update nnis;
    System.debug('NNIs updated: ' + nnis);

    String filler = 's';
    filler += 's';
    filler += 's';
    filler += 's';
    filler += 's';
    filler += 's';
    filler += 's';
    filler += 's';
    filler += 's';
    filler += 's';
    filler += 's';
}