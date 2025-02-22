/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IConsumer,
    IPartitionLambdaFactory,
    IResources,
    IResourcesFactory,
} from "@fluidframework/server-services-core";
import * as moniker from "moniker";
import { Provider } from "nconf";
import { KafkaNodeConsumer } from "./kafkaNodeConsumer";

export interface IKafkaResources extends IResources {
    lambdaFactory: IPartitionLambdaFactory;

    consumer: IConsumer;

    config: Provider;
}

export class KafkaResources implements IKafkaResources {
    constructor(
        public lambdaFactory: IPartitionLambdaFactory,
        public consumer: IConsumer,
        public config: Provider) {
    }

    public async dispose(): Promise<void> {
        const consumerClosedP = this.consumer.close();
        await Promise.all([consumerClosedP]);
    }
}

export class KafkaResourcesFactory implements IResourcesFactory<KafkaResources> {
    constructor(private readonly name: string, private readonly lambdaModule: string) {
    }

    public async create(config: Provider): Promise<KafkaResources> {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const plugin = require(this.lambdaModule);
        const lambdaFactory = await plugin.create(config) as IPartitionLambdaFactory;

        // Inbound Kafka configuration
        const kafkaEndpoint = config.get("kafka:lib:endpoint");
        const zookeeperEndpoint = config.get("zookeeper:endpoint");

        // Receive topic and group - for now we will assume an entry in config mapping
        // to the given name. Later though the lambda config will likely be split from the stream config
        const streamConfig = config.get(`lambdas:${this.name}`);
        const groupId = streamConfig.group;
        const receiveTopic = streamConfig.topic;

        const clientId = moniker.choose();

        const consumer = new KafkaNodeConsumer(
            { kafkaHost: kafkaEndpoint },
            clientId,
            groupId,
            receiveTopic,
            zookeeperEndpoint,
        );

        return new KafkaResources(
            lambdaFactory,
            consumer,
            config);
    }
}
