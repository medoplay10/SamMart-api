import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { or } from 'sequelize';
import { BaseService } from 'src/core/base/service/service.base';

import { PaymentMethod } from 'src/infrastructure/entities/payment_method/payment_method.entity';
import { Repository } from 'typeorm';
import { KuraimiUserCheckRequest } from './dto/requests/kuraimi-user-check';
import { User } from 'src/infrastructure/entities/user/user.entity';
import { decodeUUID } from 'src/core/helpers/cast.helper';

@Injectable()
export class PaymentMethodService extends BaseService<PaymentMethod> {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly payment_repo: Repository<PaymentMethod>,
    @InjectRepository(User) private readonly user_repo: Repository<User>,
  ) {
    super(payment_repo);
  }

  async jawalicashOut(
    voucher: string,
    wallet_number: string,
    order_price: number,
  ): Promise<boolean> {
    const username = process.env.wepay_username;
    const password = process.env.wepay_password;
    const grant_type = process.env.wepay_grant_type;
    const client_id = process.env.wepay_client_id;
    const client_secret = process.env.wepay_client_secret;
    const OrgID = process.env.wepay_OrgID;
    const scope = process.env.wepay_scope;
    const agent_wallet = process.env.wepay_agent_wallet;
    const agent_wallet_password = process.env.wepay_agent_wallet_password;
    const currency = process.env.wepay_currency;

    console.log(order_price);
    const login_response = await axios.post(
      'https://app.wecash.com.ye:9493/paygate/oauth/token',
      null,
      {
        params: {
          username: username,
          password: password,
          grant_type: grant_type,
          client_id: client_id,
          client_secret: client_secret,
          scope: scope,
        },
      },
    );

    if (login_response.data.access_token) {
      const access_token = login_response.data.access_token;
      console.log(access_token);

      const wallet_response = await axios.post(
        'https://app.wecash.com.ye:9493/paygate/v1/ws/callWS',

        {
          header: {
            serviceDetail: {
              corrID: '59ba381c-1f5f-4480-90cc-0660b9cc850e',
              domainName: 'WalletDomain',
              serviceName: 'PAYWA.WALLETAUTHENTICATION',
            },
            signonDetail: {
              clientID: 'WeCash',
              orgID: OrgID,
              userID: username,
              externalUser: 'user1',
            },
            messageContext: {
              clientDate: '202211101156',
              bodyType: 'Clear',
            },
          },
          body: {
            identifier: agent_wallet,
            password: agent_wallet_password,
          },
        },

        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );
      if (wallet_response.data.responseBody.access_token) {
        const wallet_token = wallet_response.data.responseBody.access_token;
        const enquire_response = await axios.post(
          'https://app.wecash.com.ye:9493/paygate/v1/ws/callWS',
          {
            header: {
              serviceDetail: {
                corrID: '59ba381c-1f5f-4480-90cc-0660b9cc850e',
                domainName: 'MerchantDomain',
                serviceName: 'PAYAG.ECOMMERCEINQUIRY',
              },
              signonDetail: {
                clientID: 'WeCash',
                orgID: OrgID,
                userID: username,
                externalUser: 'user1',
              },
              messageContext: {
                clientDate: '202211101156',
                bodyType: 'Clear',
              },
            },
            body: {
              agentWallet: agent_wallet,
              password: agent_wallet_password,
              txncurrency: currency,
              voucher: voucher,
              receiverMobile: wallet_number,
              accessToken: wallet_token,

              purpose: 'test bill payment',
            },
          },
          { headers: { Authorization: `Bearer ${access_token}` } },
        );

        console.log(enquire_response.data);
        if (
          enquire_response.data.responseStatus.systemStatusDesc === 'Success' &&
          Number(enquire_response.data.responseBody.txnamount) >= order_price
        ) {
          try {
            const response = await axios.post(
              'https://app.wecash.com.ye:9493/paygate/v1/ws/callWS',
              {
                header: {
                  serviceDetail: {
                    corrID: '59ba381c-1f5f-4480-90cc-0660b9cc850e',
                    domainName: 'MerchantDomain',
                    serviceName: 'PAYAG.ECOMMCASHOUT',
                  },
                  signonDetail: {
                    clientID: 'WeCash',
                    orgID: OrgID,
                    userID: username,
                    externalUser: 'user1',
                  },
                  messageContext: {
                    clientDate: '202211101156',
                    bodyType: 'Clear',
                  },
                },
                body: {
                  agentWallet: agent_wallet,
                  password: agent_wallet_password,
                  txncurrency: currency,
                  voucher: voucher,
                  receiverMobile: wallet_number,
                  accessToken: wallet_token,

                  purpose: 'test bill payment',
                },
              },
              { headers: { Authorization: `Bearer ${access_token}` } },
            );
            console.log(response.data);
            return response.data.responseStatus.systemStatusDesc === 'Success'
              ? true
              : false;
          } catch (error) {
            console.log(error);
          }
        } else throw new BadRequestException('The amount is not enough');
      }
    }
  }
  catch(error) {
    console.error('Error sending SMS:', error);
    return false;
  }

  async checkUser(req: KuraimiUserCheckRequest) {
    

    const user = await this.user_repo.findOne({
      where: [
        {
          username: '+967' + req.MobileNumber,
          email: req.Email,
          id: req.SCustID ? decodeUUID(req.SCustID) : null,
        },
      ],
    });

    if (!user ) return null;

    return user;
  }
}
